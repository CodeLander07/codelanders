"""
Pydantic schemas for the Financial Intelligence Reasoning Engine.

Input  → AnalysisRequest  (wraps ExtractionResult + document metadata)
Output → AnalysisResponse (strict JSON contract consumed by deterministic systems)
"""

from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel, Field


# ─── Re-use extraction schema types as input ─────────────────────────────────
# We import only what we need to avoid a circular dependency.
from app.schemas.extraction import ExtractionResult, DocumentMetadata


# ─── Request ─────────────────────────────────────────────────────────────────

class AnalysisRequest(BaseModel):
    """
    Payload sent to the reasoning engine.
    `extraction` is the output of the OCR / document parsing pipeline.
    `document_metadata` mirrors the per-document status list so the engine
    can validate document sufficiency before proceeding.
    """
    extraction: ExtractionResult


# ─── Response sub-models ──────────────────────────────────────────────────────

class DataValidation(BaseModel):
    missing_documents: List[str] = Field(default_factory=list)
    inconsistencies: List[str]   = Field(default_factory=list)


class IncomeClassification(BaseModel):
    salary:       bool = False
    freelance:    bool = False
    rental:       bool = False
    interest:     bool = False
    capital_gains: bool = False
    other:        bool = False


class DeductionOpportunity(BaseModel):
    section:    str
    reason:     str
    confidence: Literal["high", "medium", "low"]


class RegimeReasoning(BaseModel):
    suggested_regime: Literal["Old Regime", "New Regime", "Insufficient Data"]
    reason:           str


class AIInsight(BaseModel):
    title:           str
    description:     str
    priority:        Literal["high", "medium", "low"]
    related_section: str
    confidence:      Literal["high", "medium", "low"]


class ComplianceStatus(BaseModel):
    filing_ready: bool
    reason:       str


# ─── Top-level response ───────────────────────────────────────────────────────

class AnalysisResponse(BaseModel):
    status:                 Literal["success", "blocked"]
    blocked_reason:         Optional[str]            = None   # populated when status == "blocked"
    data_validation:        Optional[DataValidation] = None
    income_classification:  Optional[IncomeClassification] = None
    deduction_opportunities: Optional[List[DeductionOpportunity]] = None
    regime_reasoning:       Optional[RegimeReasoning] = None
    ai_insights:            Optional[List[AIInsight]] = None
    compliance_status:      Optional[ComplianceStatus] = None
