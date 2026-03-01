"""
TaxMate — Financial Intelligence Reasoning Engine
==================================================

Responsibility:
  Analyse structured financial data extracted from user documents and produce
  logical classifications, insight identification, regime reasoning, and
  compliance readiness checks.

Ollama Binding Rule (enforced here):
  - Every call to run_analysis() MUST supply an active ActivePolicyContext.
  - The policy context is injected into regime reasoning and AI insights so
    Ollama never has to assume or remember tax rules.
  - If no policy context is provided, the engine returns:
      { "status": "blocked", "reason": "policy_not_active" }

Other rules (hard-coded):
  - Does NOT calculate tax amounts, slabs, totals, or net values.
  - Does NOT infer or fabricate values absent from the extraction payload.
  - Is blocked entirely when no verified documents exist.
  - Returns empty lists (not assumptions) for any section with insufficient data.
  - Confidence downgrades automatically when supporting data is thin.
"""

from __future__ import annotations

import logging
from typing import List, Optional

from app.schemas.extraction import ExtractionResult
from app.schemas.analysis import (
    AnalysisRequest,
    AnalysisResponse,
    DataValidation,
    IncomeClassification,
    DeductionOpportunity,
    RegimeReasoning,
    AIInsight,
    ComplianceStatus,
)
from app.schemas.tax_policy import ActivePolicyContext

logger = logging.getLogger(__name__)

# ─── Thresholds & constants ───────────────────────────────────────────────────
# Minimum transaction count before we treat a bank statement as "present"
_MIN_BANK_TXN = 1
# Minimum annual savings amount to consider 80C meaningful
_MIN_SAVINGS_THRESHOLD = 1.0
# Minimum interest income to flag 80TTA/TTB
_MIN_INTEREST_THRESHOLD = 1.0


# ─────────────────────────────────────────────────────────────────────────────
# Gate check
# ─────────────────────────────────────────────────────────────────────────────

def _is_blocked(ext: ExtractionResult) -> bool:
    """
    Block analysis when:
     - No document metadata exists, OR
     - Every document has status 'failed', OR
     - No document has status 'parsed' or 'partial'
    """
    if not ext.document_metadata:
        return True
    valid_statuses = {"parsed", "partial"}
    return not any(m.status in valid_statuses for m in ext.document_metadata)


# ─────────────────────────────────────────────────────────────────────────────
# Task 1 — Data validation & consistency checks
# ─────────────────────────────────────────────────────────────────────────────

def _validate_data(ext: ExtractionResult) -> DataValidation:
    missing: List[str] = []
    inconsistencies: List[str] = []

    # --- Missing document checks ---
    # Salary present but no salary slip document tagged
    if ext.salary is not None:
        doc_types = {m.document_type.lower() for m in ext.document_metadata}
        has_salary_doc = any(
            kw in dt for dt in doc_types
            for kw in ("salary", "payslip", "form 16", "form-16")
        )
        if not has_salary_doc:
            missing.append(
                "Form 16 or salary slip not found — required to verify salary income"
            )

    # Rent paid but no rent receipt document
    if ext.rent_paid is not None:
        doc_types = {m.document_type.lower() for m in ext.document_metadata}
        has_rent_doc = any("rent" in dt for dt in doc_types)
        if not has_rent_doc:
            missing.append(
                "Rent receipts not uploaded — required to claim HRA exemption"
            )

    # Capital gains present but no capital gains document
    cg = ext.capital_gains
    if cg.stocks is not None or cg.mutual_funds is not None:
        doc_types = {m.document_type.lower() for m in ext.document_metadata}
        has_cg_doc = any(
            kw in dt for dt in doc_types
            for kw in ("capital gain", "stocks", "mutual fund", "broker")
        )
        if not has_cg_doc:
            missing.append(
                "Capital gains statement not uploaded — required for accurate STCG/LTCG reporting"
            )

    # Interest income present but no FD/savings document
    if ext.interest_income is not None:
        doc_types = {m.document_type.lower() for m in ext.document_metadata}
        has_interest_doc = any(
            kw in dt for dt in doc_types
            for kw in ("bank statement", "fd", "fixed deposit", "interest")
        )
        if not has_interest_doc:
            missing.append(
                "Bank statement or FD certificate not uploaded — required to validate interest income"
            )

    # --- Partial / failed document flags ---
    for m in ext.document_metadata:
        if m.status == "partial":
            inconsistencies.append(
                f"'{m.document_type}' was only partially readable — some data may be incomplete"
            )
        if m.status == "failed":
            inconsistencies.append(
                f"'{m.document_type}' could not be parsed — please re-upload a clearer copy"
            )

    # --- Cross-data inconsistency checks ---
    # EMI payments exist but no salary/income to service them
    if ext.emi_payments and ext.salary is None and not ext.bank_transactions:
        inconsistencies.append(
            "EMI payments detected but no salary or bank income source found — "
            "upload salary slip or bank statement to reconcile"
        )

    # Savings detected but no investment document
    if ext.annual_savings is not None:
        doc_types = {m.document_type.lower() for m in ext.document_metadata}
        has_invest_doc = any(
            kw in dt for dt in doc_types
            for kw in ("investment", "ppf", "elss", "lic", "nsc", "nps", "80c")
        )
        if not has_invest_doc:
            inconsistencies.append(
                "Annual savings/investments detected but no investment proof uploaded — "
                "80C deductions may not be verifiable"
            )

    return DataValidation(missing_documents=missing, inconsistencies=inconsistencies)


# ─────────────────────────────────────────────────────────────────────────────
# Task 2 — Income classification
# ─────────────────────────────────────────────────────────────────────────────

def _classify_income(ext: ExtractionResult) -> IncomeClassification:
    # Capital gains
    cg = ext.capital_gains
    has_cg = (cg.stocks is not None and cg.stocks > 0) or \
             (cg.mutual_funds is not None and cg.mutual_funds > 0)

    # Freelance/business heuristic: spending proofs present but no salary
    has_freelance = bool(ext.other_spendings) and ext.salary is None

    return IncomeClassification(
        salary=ext.salary is not None and ext.salary > 0,
        freelance=has_freelance,
        rental=ext.rent_paid is not None,         # rent_paid field used as proxy for rental activity
        interest=ext.interest_income is not None and ext.interest_income > _MIN_INTEREST_THRESHOLD,
        capital_gains=has_cg,
        other=bool(ext.other_spendings) and not has_freelance,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Task 3 — Deduction opportunity identification
# ─────────────────────────────────────────────────────────────────────────────

def _identify_deductions(ext: ExtractionResult) -> List[DeductionOpportunity]:
    opps: List[DeductionOpportunity] = []
    cg = ext.capital_gains

    # 80C — investments, EMI, savings
    if ext.annual_savings is not None and ext.annual_savings > _MIN_SAVINGS_THRESHOLD:
        opps.append(DeductionOpportunity(
            section="80C",
            reason="Annual savings / investment data extracted from uploaded documents",
            confidence="high",
        ))
    elif ext.emi_payments:
        opps.append(DeductionOpportunity(
            section="80C",
            reason="EMI payments detected — principal component of home loan EMI may be 80C eligible",
            confidence="medium",
        ))

    # 80D — health insurance (derived from other_spendings or document type tags)
    doc_types = {m.document_type.lower() for m in ext.document_metadata}
    has_health_doc = any(
        kw in dt for dt in doc_types
        for kw in ("mediclaim", "health", "insurance", "80d")
    )
    if has_health_doc:
        opps.append(DeductionOpportunity(
            section="80D",
            reason="Health insurance / mediclaim document detected",
            confidence="high",
        ))

    # HRA — rent paid
    if ext.rent_paid is not None and ext.salary is not None:
        opps.append(DeductionOpportunity(
            section="HRA",
            reason="Rent payments and salary income both present — HRA exemption likely applicable",
            confidence="high",
        ))
    elif ext.rent_paid is not None:
        opps.append(DeductionOpportunity(
            section="HRA",
            reason="Rent payments detected but salary not confirmed — HRA eligibility uncertain",
            confidence="low",
        ))

    # 80TTA / 80TTB — interest income
    if ext.interest_income is not None and ext.interest_income > _MIN_INTEREST_THRESHOLD:
        opps.append(DeductionOpportunity(
            section="80TTA / 80TTB",
            reason="Interest income from savings/FD detected — eligible for deduction up to prescribed limits",
            confidence="medium",
        ))

    # Capital gains exemptions
    if cg.mutual_funds is not None and cg.mutual_funds > 0:
        opps.append(DeductionOpportunity(
            section="Capital Gains Exemption",
            reason="Mutual fund redemption detected — LTCG exemption threshold may apply",
            confidence="medium",
        ))

    if cg.stocks is not None and cg.stocks > 0:
        opps.append(DeductionOpportunity(
            section="Capital Gains (Equity)",
            reason="Equity capital gains detected — STCG/LTCG classification required for correct treatment",
            confidence="medium",
        ))

    return opps


# ─────────────────────────────────────────────────────────────────────────────
# Task 4 — Regime reasoning (qualitative only, no amounts)
# ─────────────────────────────────────────────────────────────────────────────

def _regime_reasoning(
    ext: ExtractionResult,
    deductions: List[DeductionOpportunity],
    policy: ActivePolicyContext,
) -> RegimeReasoning:
    high_confidence = [d for d in deductions if d.confidence == "high"]
    any_deductions  = len(deductions) > 0

    # Cannot reason without salary
    if ext.salary is None and not ext.bank_transactions:
        return RegimeReasoning(
            suggested_regime="Insufficient Data",
            reason="No income source confirmed — upload salary slip or bank statement to determine optimal regime",
        )

    high_count   = len(high_confidence)
    total_count  = len(deductions)

    fy   = policy.financial_year
    p_id = policy.policy_id
    new_rebate_lakh = policy.new_regime["rebate_limit"] / 100_000 if policy.new_regime.get("rebate_limit") else 7.0

    # Strong deduction profile → Old Regime is typically beneficial
    if high_count >= 2:
        return RegimeReasoning(
            suggested_regime="Old Regime",
            reason=(
                f"{high_count} high-confidence deduction opportunities identified "
                f"(e.g., {', '.join(d.section for d in high_confidence[:2])}). "
                f"Under the active tax policy ({fy}, policy #{p_id}), "
                "multiple deductions can substantially reduce Old Regime taxable income."
            ),
        )

    # Moderate deduction profile → conditional
    if total_count == 1:
        return RegimeReasoning(
            suggested_regime="New Regime",
            reason=(
                "Only one deduction opportunity detected. "
                f"The New Regime ({fy}, policy #{p_id}) offers a zero-tax rebate up to "
                f"₹{new_rebate_lakh:.0f}L with simplified flat slabs — "
                "likely more favourable when deductions are limited."
            ),
        )

    if any_deductions:
        return RegimeReasoning(
            suggested_regime="Old Regime",
            reason=(
                f"{total_count} deduction opportunities identified under active policy ({fy}, #{p_id}). "
                "Moderate deduction profile may still favour the Old Regime — "
                "complete the questionnaire to trigger a precise numeric comparison."
            ),
        )

    # No deductions detected
    return RegimeReasoning(
        suggested_regime="New Regime",
        reason=(
            f"No deduction opportunities found. Under active policy ({fy}, policy #{p_id}), "
            f"the New Regime's zero-tax rebate up to ₹{new_rebate_lakh:.0f}L "
            "and simplified slabs are advantageous when no deductions are claimed."
        ),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Task 5 — AI insight generation
# ─────────────────────────────────────────────────────────────────────────────

def _generate_insights(
    ext: ExtractionResult,
    validation: DataValidation,
    deductions: List[DeductionOpportunity],
    classification: IncomeClassification,
    policy: ActivePolicyContext,
) -> List[AIInsight]:
    insights: List[AIInsight] = []
    cg = ext.capital_gains

    # ── High priority ─────────────────────────────────────────────────────────

    # Missing Form 16 / salary document
    if any("form 16" in m.lower() or "salary slip" in m.lower() for m in validation.missing_documents):
        insights.append(AIInsight(
            title="Form 16 not uploaded",
            description=(
                "Form 16 is required to auto-populate income details and verify TDS credits. "
                "Without it, income data may be incomplete and filing could be rejected."
            ),
            priority="high",
            related_section="Documents & Uploads",
            confidence="high",
        ))

    # Partial documents
    if any("partially readable" in i.lower() for i in validation.inconsistencies):
        insights.append(AIInsight(
            title="Document quality issue detected",
            description=(
                "One or more documents were only partially parsed. "
                "Re-upload a clearer, machine-readable copy to ensure complete data extraction."
            ),
            priority="high",
            related_section="Documents & Uploads",
            confidence="high",
        ))

    # Capital gains detected — compliance risk
    if classification.capital_gains:
        insights.append(AIInsight(
            title="Capital gains income requires separate reporting",
            description=(
                "Equity or mutual fund capital gains detected. "
                "These must be reported under the correct ITR form (ITR-2 or ITR-3). "
                "Incorrect form selection may result in defective return notices."
            ),
            priority="high",
            related_section="Filing & Compliance",
            confidence="high",
        ))

    # ── Medium priority ───────────────────────────────────────────────────────

    # 80C not fully utilised signal
    has_80c = any(d.section == "80C" for d in deductions)
    if has_80c and ext.annual_savings is not None:
        insights.append(AIInsight(
            title="80C deduction may not be fully utilised",
            description=(
                "Investment data detected but the ₹1.5L limit under Section 80C may not be "
                "exhausted. Consider uploading additional investment proofs (PPF, ELSS, NSC) to maximise this deduction."
            ),
            priority="medium",
            related_section="Deductions & Exemptions",
            confidence="medium",
        ))

    # HRA opportunity
    if classification.rental and ext.salary is not None:
        insights.append(AIInsight(
            title="HRA exemption opportunity identified",
            description=(
                "Rent payments and salary income both found. "
                "Ensure rent receipts and the landlord's PAN are uploaded to claim full HRA exemption under Section 10(13A)."
            ),
            priority="medium",
            related_section="Deductions & Exemptions",
            confidence="high",
        ))

    # NPS additional deduction — use policy limit if available
    nps_limit = int(policy.deduction_limits.get("80CCD_1B", 50000))
    if ext.salary is not None:
        insights.append(AIInsight(
            title=f"Section 80CCD(1B) — additional ₹{nps_limit:,} deduction available",
            description=(
                f"Salaried individuals can claim an additional deduction of up to ₹{nps_limit:,} "
                f"under Section 80CCD(1B) for NPS contributions (active policy: "
                f"{policy.financial_year}, #{policy.policy_id}), exclusively under the Old Regime. "
                "No NPS contribution data was found in uploaded documents."
            ),
            priority="medium",
            related_section="Deductions & Exemptions",
            confidence="medium",
        ))

    # EMI principal 80C
    if ext.emi_payments and not has_80c:
        insights.append(AIInsight(
            title="Home loan EMI principal may qualify under 80C",
            description=(
                "EMI payments detected. If these are for a home loan, "
                "the principal repayment component is eligible under Section 80C up to ₹1.5L. "
                "Upload a loan statement to verify."
            ),
            priority="medium",
            related_section="Deductions & Exemptions",
            confidence="medium",
        ))

    # Interest income — 80TTA
    if classification.interest:
        insights.append(AIInsight(
            title="Interest income — 80TTA / 80TTB deduction applicable",
            description=(
                "Interest income from savings account or FD detected. "
                "Deduction available under Section 80TTA (up to ₹10,000) for individuals below 60, "
                "or Section 80TTB (up to ₹50,000) for senior citizens."
            ),
            priority="medium",
            related_section="Deductions & Exemptions",
            confidence="medium",
        ))

    # ── Low priority ──────────────────────────────────────────────────────────

    # Advance tax reminder
    if ext.salary is not None or classification.capital_gains:
        insights.append(AIInsight(
            title="Advance tax obligation — verify Q4 instalment",
            description=(
                "Taxpayers with income beyond salary TDS (e.g., capital gains, rental, freelance) "
                "are required to pay advance tax. Failure to pay results in interest under Sections 234B and 234C."
            ),
            priority="low",
            related_section="Filing & Compliance",
            confidence="medium",
        ))

    # Missing bank statement
    if not ext.bank_transactions and ext.salary is None:
        insights.append(AIInsight(
            title="Bank statement not uploaded",
            description=(
                "No bank statement data found. Uploading your bank statement helps verify "
                "income credits, interest income, and spending patterns for a more accurate analysis."
            ),
            priority="low",
            related_section="Documents & Uploads",
            confidence="high",
        ))

    # Inconsistency notices (low priority informational)
    for note in validation.inconsistencies:
        if "partially readable" not in note.lower() and "failed" not in note.lower():
            insights.append(AIInsight(
                title="Data consistency notice",
                description=note,
                priority="low",
                related_section="Dashboard",
                confidence="low",
            ))

    return insights


# ─────────────────────────────────────────────────────────────────────────────
# Task 6 — Compliance & filing readiness
# ─────────────────────────────────────────────────────────────────────────────

def _compliance_status(
    ext: ExtractionResult,
    validation: DataValidation,
    classification: IncomeClassification,
) -> ComplianceStatus:
    issues = []

    # No income source
    if not classification.salary and not classification.rental \
            and not classification.interest and not classification.capital_gains:
        issues.append("no income source confirmed from uploaded documents")

    # Missing key documents
    if validation.missing_documents:
        issues.append(validation.missing_documents[0])

    # Failed documents present
    failed = [m for m in ext.document_metadata if m.status == "failed"]
    if failed:
        issues.append(f"{len(failed)} document(s) failed to parse")

    if issues:
        return ComplianceStatus(
            filing_ready=False,
            reason="; ".join(issues[:2]),   # surface at most two blockers
        )

    return ComplianceStatus(
        filing_ready=True,
        reason=(
            "All uploaded documents parsed successfully and income sources identified. "
            "Complete the questionnaire and review deduction sections before proceeding to file."
        ),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Public entry point
# ─────────────────────────────────────────────────────────────────────────────

def run_analysis(
    request: AnalysisRequest,
    policy: Optional[ActivePolicyContext] = None,
) -> AnalysisResponse:
    """
    Main reasoning pipeline. Called by the /insights/analyse endpoint.

    Ollama Binding Rule:
        An ActivePolicyContext MUST be supplied. If ``policy`` is None the engine
        returns a blocked response with reason ``policy_not_active``.
        This ensures every analysis is grounded in the admin-controlled active
        policy rather than assumed rules.

    Returns a blocked response if:
      - No active policy supplied
      - No valid documents in the extraction payload
    """
    # ── Gate 1: active policy required ────────────────────────────────────────
    if policy is None:
        logger.warning("Analysis blocked: no active policy context provided.")
        return AnalysisResponse(
            status="blocked",
            blocked_reason="policy_not_active",
        )

    ext = request.extraction

    # ── Gate 2: verified documents required ───────────────────────────────────
    if _is_blocked(ext):
        logger.warning("Analysis blocked: no valid documents in extraction payload.")
        return AnalysisResponse(
            status="blocked",
            blocked_reason="documents_required",
        )

    # ── Run tasks ─────────────────────────────────────────────────────────────
    try:
        validation      = _validate_data(ext)
        classification  = _classify_income(ext)
        deductions      = _identify_deductions(ext)
        regime          = _regime_reasoning(ext, deductions, policy)
        insights        = _generate_insights(ext, validation, deductions, classification, policy)
        compliance      = _compliance_status(ext, validation, classification)
    except Exception as exc:
        logger.exception("Reasoning engine error: %s", exc)
        # Fail-safe: return blocked rather than partial/corrupt output
        return AnalysisResponse(
            status="blocked",
            blocked_reason=f"internal_error: {str(exc)}",
        )

    return AnalysisResponse(
        status="success",
        data_validation=validation,
        income_classification=classification,
        deduction_opportunities=deductions,
        regime_reasoning=regime,
        ai_insights=insights,
        compliance_status=compliance,
    )
