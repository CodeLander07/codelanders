"""
TaxMate — Post-Upload Processing Pipeline
==========================================

Stages (in order)
-----------------
1. OCR      — extract structured financial data from the uploaded file
2. validate — ensure at least one financial field exists + doc status is valid
3. calculate — run TaxEngine with the ACTIVE policy
4. analyze  — run AI reasoning engine + Ollama (degrades gracefully)
5. complete — all data stored; dashboard unlocked for this user

The pipeline state is stored in USER_PIPELINE_RESULTS, keyed by
(user_id, task_id).  Downstream endpoints read from this dict.

Fail-safe rules (enforced here)
--------------------------------
- NEVER show data without OCR + parsing   → gate at stage "validate"
- NEVER run AI before structured data     → gate at stage "calculate"
- NEVER unlock dashboard on upload alone  → only "complete" unlocks
- Upload ≠ Processing ≠ Insights
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.services.ocr_service import process_document
from app.services.tax_engine import TaxEngine
from app.services.policy_engine import get_active_context
from app.services.ollama_service import generate_financial_insights

logger = logging.getLogger(__name__)


# ── Stage literals ─────────────────────────────────────────────────────────────
STAGE_QUEUED     = "queued"
STAGE_OCR        = "ocr"
STAGE_VALIDATING = "validating"
STAGE_CALCULATING = "calculating"
STAGE_ANALYZING  = "analyzing"
STAGE_COMPLETE   = "complete"
STAGE_FAILED     = "failed"


# ── In-memory result store ─────────────────────────────────────────────────────
# { user_id (int) → { task_id (str) → PipelineResult (dict) } }
USER_PIPELINE_RESULTS: Dict[int, Dict[str, Any]] = {}


def _store(user_id: int, task_id: str, result: Dict[str, Any]) -> None:
    if user_id not in USER_PIPELINE_RESULTS:
        USER_PIPELINE_RESULTS[user_id] = {}
    USER_PIPELINE_RESULTS[user_id][task_id] = result


def _update(user_id: int, task_id: str, **kwargs: Any) -> None:
    existing = USER_PIPELINE_RESULTS.get(user_id, {}).get(task_id, {})
    existing.update(kwargs)
    _store(user_id, task_id, existing)


def _fail(user_id: int, task_id: str, reason: str) -> None:
    _update(
        user_id, task_id,
        pipeline_stage=STAGE_FAILED,
        error=reason,
        completed_at=datetime.now(timezone.utc).isoformat(),
    )
    logger.warning("Pipeline failed for task %s: %s", task_id, reason)


def initial_record(
    user_id: int,
    task_id: str,
    filename: str,
) -> None:
    """
    Create the initial "queued" record immediately after upload acceptance.
    The frontend can poll this right away.
    """
    _store(user_id, task_id, {
        "task_id":        task_id,
        "filename":       filename,
        "document_type":  None,
        "pipeline_stage": STAGE_QUEUED,
        "ocr_status":     "pending",
        "calculations":   None,
        "analysis":       None,
        "ollama":         None,
        "error":          None,
        "started_at":     datetime.now(timezone.utc).isoformat(),
        "completed_at":   None,
    })


def run_pipeline(
    file_path: str,
    filename: str,
    user_id: int,
    task_id: str,
    db: Session,
) -> None:
    """
    Full synchronous pipeline — intended to be called inside a BackgroundTask.

    Parameters
    ----------
    file_path : absolute path to the uploaded file (will be deleted by ocr_service)
    filename  : original uploaded filename
    user_id   : authenticated user's DB id
    task_id   : unique task identifier issued at upload time
    db        : SQLAlchemy session (used to resolve the active policy)
    """

    # ─── Stage 1: OCR + extraction ─────────────────────────────────────────────
    _update(user_id, task_id, pipeline_stage=STAGE_OCR, ocr_status="running")
    logger.info("[pipeline:%s] Stage 1 — OCR + extraction", task_id)

    try:
        ocr_result = process_document(file_path, filename)
    except Exception as exc:
        _fail(user_id, task_id, f"OCR crashed: {exc}")
        return

    doc_type   = ocr_result.get("document_type", "Unknown")
    doc_status = ocr_result.get("status", "failed")   # "parsed" | "partial" | "failed"
    extraction = ocr_result.get("extraction", {})

    _update(
        user_id, task_id,
        document_type=doc_type,
        ocr_status=doc_status,
        extraction=extraction,
    )

    if doc_status == "failed":
        _fail(user_id, task_id, "OCR failed — document could not be parsed.")
        return

    # ─── Stage 2: Validate structured data ────────────────────────────────────
    _update(user_id, task_id, pipeline_stage=STAGE_VALIDATING)
    logger.info("[pipeline:%s] Stage 2 — validation", task_id)

    if not _has_financial_data(extraction):
        _fail(
            user_id, task_id,
            "Document uploaded and parsed but no financial fields were found. "
            "Re-upload a clearer copy or a supported document type.",
        )
        return

    # ─── Stage 3: Deterministic tax calculation ────────────────────────────────
    _update(user_id, task_id, pipeline_stage=STAGE_CALCULATING)
    logger.info("[pipeline:%s] Stage 3 — tax calculation", task_id)

    try:
        policy_ctx = get_active_context(db)
    except Exception as exc:
        # Policy state error — store it but continue (calculations use fallback)
        logger.warning("[pipeline:%s] Policy error: %s — using fallback slabs", task_id, exc)
        policy_ctx = None

    calculations = _run_calculations(extraction, policy_ctx)
    _update(user_id, task_id, calculations=calculations, policy_id=policy_ctx.policy_id if policy_ctx else None)

    # ─── Stage 4: AI reasoning + Ollama ───────────────────────────────────────
    _update(user_id, task_id, pipeline_stage=STAGE_ANALYZING)
    logger.info("[pipeline:%s] Stage 4 — AI analysis + Ollama", task_id)

    # 4a. Rule-based analysis (ai_engine — always runs)
    rule_analysis = _run_ai_engine(extraction, policy_ctx)

    # 4b. Ollama (optional — degrades gracefully)
    policy_dict = policy_ctx.model_dump() if policy_ctx else {}
    doc_types   = [doc_type] if doc_type else []

    ollama_result = generate_financial_insights(
        extraction_summary=extraction,
        calculations=calculations,
        policy_context=policy_dict,
        document_types=doc_types,
    )

    _update(
        user_id, task_id,
        analysis=rule_analysis,
        ollama=ollama_result,
        insights_status=ollama_result.get("status", "pending"),
    )

    # ─── Stage 5: Complete ────────────────────────────────────────────────────
    _update(
        user_id, task_id,
        pipeline_stage=STAGE_COMPLETE,
        completed_at=datetime.now(timezone.utc).isoformat(),
    )
    logger.info("[pipeline:%s] Pipeline complete ✓", task_id)


# ── Private helpers ────────────────────────────────────────────────────────────

def _has_financial_data(extraction: Dict[str, Any]) -> bool:
    """
    Return True if at least one meaningful financial field is present.
    A document that produces only document_metadata with no figures fails this check.
    """
    candidates = [
        extraction.get("salary"),
        extraction.get("rent_paid"),
        extraction.get("interest_income"),
        extraction.get("annual_savings"),
        extraction.get("bank_transactions"),
        extraction.get("emi_payments"),
        extraction.get("other_spendings"),
    ]
    cg = extraction.get("capital_gains", {})
    if isinstance(cg, dict):
        candidates += [cg.get("stocks"), cg.get("mutual_funds")]

    return any(
        (v is not None and v != [] and v != {})
        for v in candidates
        if v is not None
    )


def _run_calculations(
    extraction: Dict[str, Any],
    policy_ctx,   # ActivePolicyContext | None
) -> Dict[str, Any]:
    """
    Build income_details and deductions dicts from extraction, then run TaxEngine.
    Falls back to empty values when fields are absent (no inference).
    """
    income_details: Dict[str, float] = {}
    deductions:     Dict[str, float] = {}

    if extraction.get("salary"):
        income_details["salary"] = float(extraction["salary"])

    if extraction.get("interest_income"):
        income_details["interest"] = float(extraction["interest_income"])

    cg = extraction.get("capital_gains", {})
    if isinstance(cg, dict):
        stocks = cg.get("stocks")
        mf     = cg.get("mutual_funds")
        if stocks:
            income_details["capital_gains_stocks"] = float(stocks)
        if mf:
            income_details["capital_gains_mf"] = float(mf)

    if extraction.get("annual_savings"):
        deductions["80C_savings"] = min(
            float(extraction["annual_savings"]),
            150000.0,   # hard cap — actual limit from policy used in engine
        )

    if extraction.get("rent_paid") and extraction.get("salary"):
        # Conservative HRA estimate: 40 % of salary or rent paid, whichever is lower
        hra_estimate = min(float(extraction["rent_paid"]), float(extraction.get("salary", 0)) * 0.40)
        if hra_estimate > 0:
            deductions["hra"] = hra_estimate

    if not income_details:
        # Nothing to calculate — return a placeholder
        return {
            "status":       "skipped",
            "reason":       "no_income_fields",
            "gross_income": 0,
        }

    try:
        engine = TaxEngine(
            age=30,                     # default — questionnaire age used later
            income_details=income_details,
            deductions=deductions,
            policy=policy_ctx,
        )
        result = engine.get_recommendation()
        result["status"] = "calculated"
        return result
    except Exception as exc:
        logger.exception("TaxEngine failed: %s", exc)
        return {"status": "error", "reason": str(exc)}


def _run_ai_engine(
    extraction: Dict[str, Any],
    policy_ctx,   # ActivePolicyContext | None
) -> Optional[Dict[str, Any]]:
    """
    Run the rule-based ai_engine and return its response as a dict.
    Returns None on failure (Ollama insights are separate).
    """
    try:
        from app.services.ai_engine import run_analysis
        from app.schemas.analysis import AnalysisRequest
        from app.schemas.extraction import (
            ExtractionResult, CapitalGains, DocumentMetadata,
        )

        cg_raw = extraction.get("capital_gains", {})
        cg = CapitalGains(
            stocks=cg_raw.get("stocks") if isinstance(cg_raw, dict) else None,
            mutual_funds=cg_raw.get("mutual_funds") if isinstance(cg_raw, dict) else None,
        )

        meta_raw = extraction.get("document_metadata", [])
        meta_list = []
        for m in meta_raw:
            if isinstance(m, dict):
                meta_list.append(DocumentMetadata(
                    filename=m.get("filename", "unknown"),
                    document_type=m.get("document_type", "Unknown"),
                    status=m.get("status", "failed"),
                    confidence=m.get("confidence", 0.5),
                    pages_processed=m.get("pages_processed", 0),
                ))

        ext_model = ExtractionResult(
            salary=extraction.get("salary"),
            bank_transactions=extraction.get("bank_transactions", []),
            rent_paid=extraction.get("rent_paid"),
            emi_payments=extraction.get("emi_payments", []),
            interest_income=extraction.get("interest_income"),
            capital_gains=cg,
            annual_savings=extraction.get("annual_savings"),
            other_spendings=extraction.get("other_spendings", []),
            document_metadata=meta_list,
        )

        response = run_analysis(
            AnalysisRequest(extraction=ext_model),
            policy=policy_ctx,
        )
        return response.model_dump()
    except Exception as exc:
        logger.exception("AI engine error: %s", exc)
        return None
