"""
TaxMate — Ollama Service
========================

Thin wrapper around the local Ollama HTTP API.

Rules
-----
- ONLY called AFTER structured extraction data and deterministic calculations exist.
- If Ollama is unreachable, returns a graceful "pending" response — never raises.
- Does NOT perform tax calculations.
- Every request MUST include the active policy context (injected by pipeline.py).
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger(__name__)

# Ollama default endpoint — override via OLLAMA_HOST env var in production
OLLAMA_HOST  = "http://localhost:11434"
OLLAMA_MODEL = "llama3"          # change to any locally pulled model


def is_ollama_available() -> bool:
    """Quick health check — returns True if Ollama is reachable."""
    try:
        r = httpx.get(f"{OLLAMA_HOST}/api/tags", timeout=3.0)
        return r.status_code == 200
    except Exception:
        return False


def generate_financial_insights(
    extraction_summary: Dict[str, Any],
    calculations: Dict[str, Any],
    policy_context: Dict[str, Any],
    document_types: list[str],
) -> Dict[str, Any]:
    """
    Call Ollama with the structured financial context and return parsed insights.

    Returns
    -------
    {
        "status": "complete" | "pending",
        "model": str | None,
        "insights": [...],          # only present when status == "complete"
        "regime_note": str | None,
        "compliance_warnings": [...],
        "missing_documents": [...],
        "raw_response": str | None, # only for debugging
    }
    When Ollama is unavailable the status is "pending" and all insight fields are empty.
    """
    if not is_ollama_available():
        logger.warning("Ollama not available — insights marked as pending.")
        return _pending_response()

    # ── Build prompt ──────────────────────────────────────────────────────────
    fy           = policy_context.get("financial_year", "FY 2025-26")
    policy_id    = policy_context.get("policy_id", "unknown")
    std_ded      = policy_context.get("standard_deduction", 75000)
    ded_limits   = policy_context.get("deduction_limits", {})
    old_rebate   = policy_context.get("old_regime", {}).get("rebate_limit", 500000)
    new_rebate   = policy_context.get("new_regime", {}).get("rebate_limit", 1200000)

    gross_income = calculations.get("gross_income", 0)
    old_tax      = calculations.get("old_regime", {}).get("tax_liability", 0)
    new_tax      = calculations.get("new_regime", {}).get("tax_liability", 0)
    recommendation = calculations.get("recommendation", "Unknown")

    salary        = extraction_summary.get("salary")
    rent_paid     = extraction_summary.get("rent_paid")
    interest      = extraction_summary.get("interest_income")
    annual_savings = extraction_summary.get("annual_savings")
    emi_count     = len(extraction_summary.get("emi_payments", []))
    bank_txn_count = len(extraction_summary.get("bank_transactions", []))

    prompt = f"""You are a professional Indian tax advisor assistant for TaxMate.
You have been given verified financial data extracted from the user's uploaded documents.
You MUST reason strictly from the data provided — do NOT assume or invent values.

=== ACTIVE TAX POLICY ===
Financial Year : {fy}
Policy ID      : {policy_id}
Standard Deduction: ₹{std_ded:,.0f}
80C Limit      : ₹{ded_limits.get('80C', 150000):,.0f}
80D Limit      : ₹{ded_limits.get('80D_general', 25000):,.0f}
Old Regime Rebate (87A): up to ₹{old_rebate:,.0f}
New Regime Rebate (87A): up to ₹{new_rebate:,.0f}

=== EXTRACTED FINANCIAL DATA ===
Documents uploaded     : {', '.join(document_types) if document_types else 'None'}
Salary income          : {'₹' + f'{salary:,.0f}' if salary else 'Not found'}
Rent paid              : {'₹' + f'{rent_paid:,.0f}' if rent_paid else 'Not found'}
Interest income        : {'₹' + f'{interest:,.0f}' if interest else 'Not found'}
Annual savings         : {'₹' + f'{annual_savings:,.0f}' if annual_savings else 'Not found'}
EMI entries            : {emi_count}
Bank transactions      : {bank_txn_count}

=== DETERMINISTIC CALCULATIONS (DO NOT RECOMPUTE) ===
Gross Income           : ₹{gross_income:,.0f}
Old Regime Tax         : ₹{old_tax:,.0f}
New Regime Tax         : ₹{new_tax:,.0f}
Recommended Regime     : {recommendation}

=== YOUR TASK ===
Respond with a JSON object (no markdown fences) with exactly these keys:
{{
  "insights": [
    {{"title": "<short title>", "description": "<one sentence>", "priority": "high|medium|low"}}
  ],
  "regime_note": "<one paragraph explaining why {recommendation} is recommended>",
  "compliance_warnings": ["<warning 1>", ...],
  "missing_documents": ["<document name>", ...]
}}

Rules:
- Maximum 5 insights. Each must reference specific numbers from the data above.
- Do NOT recalculate tax amounts. Do NOT produce different amounts than shown.
- compliance_warnings: list only real ITR compliance risks based on the data.
- missing_documents: list only documents relevant to the extracted income types.
- If salary is present but no Form 16 is found in documents uploaded, flag it.
"""

    # ── Call Ollama ───────────────────────────────────────────────────────────
    try:
        response = httpx.post(
            f"{OLLAMA_HOST}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=60.0,
        )
        if response.status_code != 200:
            logger.warning("Ollama returned HTTP %s", response.status_code)
            return _pending_response()

        raw = response.json().get("response", "")
        parsed = _parse_ollama_json(raw)

        return {
            "status":               "complete",
            "model":                OLLAMA_MODEL,
            "insights":             parsed.get("insights", []),
            "regime_note":          parsed.get("regime_note"),
            "compliance_warnings":  parsed.get("compliance_warnings", []),
            "missing_documents":    parsed.get("missing_documents", []),
            "raw_response":         raw,
        }

    except Exception as exc:
        logger.exception("Ollama call failed: %s", exc)
        return _pending_response()


def _parse_ollama_json(raw: str) -> Dict[str, Any]:
    """Extract the JSON object from Ollama's text response."""
    import json, re
    # Strip markdown fences if model adds them
    raw = re.sub(r"```json|```", "", raw).strip()
    # Find first { ... } block
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        return {}
    try:
        return json.loads(match.group())
    except json.JSONDecodeError:
        return {}


def _pending_response() -> Dict[str, Any]:
    return {
        "status":               "pending",
        "model":                None,
        "insights":             [],
        "regime_note":          None,
        "compliance_warnings":  [],
        "missing_documents":    [],
        "raw_response":         None,
    }
