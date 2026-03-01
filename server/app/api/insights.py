"""
TaxMate — /insights API router
================================

Endpoints
---------
POST /insights/analyse
    Accepts a full ExtractionResult payload and returns the AnalysisResponse.

POST /insights/analyse/{task_id}
    Pulls the stored extraction result for a specific document task,
    runs the reasoning engine, and returns the AnalysisResponse.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.api.documents import USER_DOC_RESULTS          # shared in-memory store
from app.db.session import get_db
from app.models.user import User
from app.schemas.analysis import AnalysisRequest, AnalysisResponse
from app.schemas.extraction import ExtractionResult, DocumentMetadata, CapitalGains
from app.services.ai_engine import run_analysis
from app.services.policy_engine import get_active_context, PolicyStateError

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# POST /insights/analyse  — full payload
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/analyse",
    response_model=AnalysisResponse,
    summary="Analyse financial data extracted from user documents",
)
def analyse_extraction(
    request: AnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Accept a complete ExtractionResult payload and run the reasoning engine.

    - Returns **blocked** with ``blocked_reason = "policy_not_active"`` when no
      active tax policy exists.
    - Returns **blocked** with ``blocked_reason = "documents_required"`` when no
      valid (parsed/partial) documents are present in ``extraction.document_metadata``.
    - Returns the full ``AnalysisResponse`` otherwise.  No tax amounts are
      calculated or returned.

    (Ollama Binding Rule: active policy is always injected into every analysis.)
    """
    try:
        policy_ctx = get_active_context(db)
    except PolicyStateError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return run_analysis(request, policy=policy_ctx)


# ─────────────────────────────────────────────────────────────────────────────
# POST /insights/analyse/{task_id}  — derive from stored task
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/analyse/{task_id}",
    response_model=AnalysisResponse,
    summary="Analyse a previously processed document task",
)
def analyse_by_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Pull the stored extraction result for *task_id* and run the reasoning engine.

    The extraction data comes from the in-memory ``USER_DOC_RESULTS`` dict
    populated by the document upload pipeline.  Returns 404 when the task
    is not found, or 422 when the task completed with an error status.
    """
    user_key = str(current_user.id)
    user_results: dict = USER_DOC_RESULTS.get(user_key, {})

    if task_id not in user_results:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found for current user.",
        )

    stored = user_results[task_id]   # dict returned by ocr_service.process_document

    # Abort early if the document processing itself failed
    if stored.get("status") == "error":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Document processing failed for task '{task_id}': {stored.get('error', 'unknown error')}",
        )

    # Build an ExtractionResult from the stored payload
    raw_extraction: dict = stored.get("extraction", {})
    if not raw_extraction:
        # No extraction data → treat as blocked
        return AnalysisResponse(status="blocked", blocked_reason="documents_required")

    # Wrap in a fresh ExtractionResult so the analysis gate can evaluate it
    cg_raw   = raw_extraction.get("capital_gains", {})
    metadata = raw_extraction.get("document_metadata", [])

    # Build DocumentMetadata entries (stored as dicts from OCR service)
    doc_meta_list = []
    for m in metadata:
        if isinstance(m, dict):
            doc_meta_list.append(DocumentMetadata(
                filename=m.get("filename", task_id),
                document_type=m.get("document_type", "Unknown"),
                status=m.get("status", "failed"),
                confidence=m.get("confidence", 0.0),
                pages_processed=m.get("pages_processed", 0),
            ))
        else:
            doc_meta_list.append(m)   # already a DataModel instance

    # If no metadata from extraction, synthesise one entry from the stored task
    if not doc_meta_list:
        doc_meta_list.append(DocumentMetadata(
            filename=stored.get("filename", task_id),
            document_type=stored.get("document_type", "Unknown"),
            status="parsed" if stored.get("status") == "completed" else "failed",
            confidence=0.5,
            pages_processed=0,
        ))

    extraction = ExtractionResult(
        salary=raw_extraction.get("salary"),
        bank_transactions=raw_extraction.get("bank_transactions", []),
        rent_paid=raw_extraction.get("rent_paid"),
        emi_payments=raw_extraction.get("emi_payments", []),
        interest_income=raw_extraction.get("interest_income"),
        capital_gains=CapitalGains(
            stocks=cg_raw.get("stocks") if isinstance(cg_raw, dict) else None,
            mutual_funds=cg_raw.get("mutual_funds") if isinstance(cg_raw, dict) else None,
        ),
        annual_savings=raw_extraction.get("annual_savings"),
        other_spendings=raw_extraction.get("other_spendings", []),
        document_metadata=doc_meta_list,
    )

    try:
        policy_ctx = get_active_context(db)
    except PolicyStateError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return run_analysis(AnalysisRequest(extraction=extraction), policy=policy_ctx)
