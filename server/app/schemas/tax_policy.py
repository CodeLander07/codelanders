"""
TaxMate — Pydantic schemas for TaxPolicy CRUD and API responses
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


# ─── Slab schema ──────────────────────────────────────────────────────────────

class TaxSlab(BaseModel):
    min: float
    max: Optional[float] = None   # None means unbounded (top bracket)
    rate: float = Field(..., ge=0.0, le=1.0, description="Tax rate as decimal (0.05 = 5 %)")


# ─── Create (admin → new draft) ───────────────────────────────────────────────

class TaxPolicyCreate(BaseModel):
    financial_year:  str = Field(..., examples=["FY 2025-26"])
    version:         str = Field(..., examples=["v1"])
    notes:           Optional[str] = None

    effective_from:  Optional[str] = None   # "2025-04-01"
    effective_to:    Optional[str] = None   # "2026-03-31"
    filing_deadline: Optional[str] = None   # "2025-07-31"

    standard_deduction:           float = 75000.0
    old_regime_rebate_limit:      float = 500000.0
    old_regime_rebate_amount:     float = 12500.0
    new_regime_rebate_limit:      float = 1200000.0
    new_regime_rebate_amount:     float = 60000.0
    cess_rate:                    float = Field(0.04, ge=0.0, le=0.10)

    deduction_limits:   Optional[Dict[str, float]] = None
    old_regime_slabs:   Optional[List[TaxSlab]]    = None
    new_regime_slabs:   Optional[List[TaxSlab]]    = None
    eligibility_flags:  Optional[Dict[str, Any]]   = None


# ─── Update (only whilst draft) ───────────────────────────────────────────────

class TaxPolicyUpdate(BaseModel):
    notes:           Optional[str] = None

    effective_from:  Optional[str] = None
    effective_to:    Optional[str] = None
    filing_deadline: Optional[str] = None

    standard_deduction:           Optional[float] = None
    old_regime_rebate_limit:      Optional[float] = None
    old_regime_rebate_amount:     Optional[float] = None
    new_regime_rebate_limit:      Optional[float] = None
    new_regime_rebate_amount:     Optional[float] = None
    cess_rate:                    Optional[float] = Field(None, ge=0.0, le=0.10)

    deduction_limits:   Optional[Dict[str, float]] = None
    old_regime_slabs:   Optional[List[TaxSlab]]    = None
    new_regime_slabs:   Optional[List[TaxSlab]]    = None
    eligibility_flags:  Optional[Dict[str, Any]]   = None


# ─── Response ─────────────────────────────────────────────────────────────────

class TaxPolicyResponse(BaseModel):
    id:              int
    financial_year:  str
    version:         str
    status:          str               # draft | active | archived
    notes:           Optional[str]

    effective_from:  Optional[str]
    effective_to:    Optional[str]
    filing_deadline: Optional[str]

    standard_deduction:           float
    old_regime_rebate_limit:      float
    old_regime_rebate_amount:     float
    new_regime_rebate_limit:      float
    new_regime_rebate_amount:     float
    cess_rate:                    float

    deduction_limits:   Dict[str, float]
    old_regime_slabs:   List[Dict[str, Any]]
    new_regime_slabs:   List[Dict[str, Any]]
    eligibility_flags:  Dict[str, Any]

    created_at:   Optional[datetime]
    updated_at:   Optional[datetime]
    activated_at: Optional[datetime]
    archived_at:  Optional[datetime]
    created_by:   Optional[int]

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, obj: Any) -> "TaxPolicyResponse":  # noqa: ANN401
        return cls(
            id=obj.id,
            financial_year=obj.financial_year,
            version=obj.version,
            status=obj.status,
            notes=obj.notes,
            effective_from=obj.effective_from,
            effective_to=obj.effective_to,
            filing_deadline=obj.filing_deadline,
            standard_deduction=obj.standard_deduction,
            old_regime_rebate_limit=obj.old_regime_rebate_limit,
            old_regime_rebate_amount=obj.old_regime_rebate_amount,
            new_regime_rebate_limit=obj.new_regime_rebate_limit,
            new_regime_rebate_amount=obj.new_regime_rebate_amount,
            cess_rate=obj.cess_rate,
            deduction_limits=obj.deduction_limits,
            old_regime_slabs=obj.old_regime_slabs,
            new_regime_slabs=obj.new_regime_slabs,
            eligibility_flags=obj.eligibility_flags,
            created_at=obj.created_at,
            updated_at=obj.updated_at,
            activated_at=obj.activated_at,
            archived_at=obj.archived_at,
            created_by=obj.created_by,
        )


# ─── Activation result ────────────────────────────────────────────────────────

class ActivationResult(BaseModel):
    activated_policy_id:    int
    deactivated_policy_id:  Optional[int] = None
    message:                str


# ─── Active policy context (injected into AI / tax engine) ────────────────────

class ActivePolicyContext(BaseModel):
    """Serialisable policy snapshot used by AI and tax engines."""
    policy_id:          int
    financial_year:     str
    version:            str
    effective_from:     Optional[str]
    effective_to:       Optional[str]
    filing_deadline:    Optional[str]
    standard_deduction: float
    deduction_limits:   Dict[str, float]
    old_regime:         Dict[str, Any]
    new_regime:         Dict[str, Any]
    cess_rate:          float
    eligibility_flags:  Dict[str, Any]
