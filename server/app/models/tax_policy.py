"""
TaxMate — TaxPolicy SQLAlchemy model
=====================================

Each row represents one version of Indian Income Tax policy for a financial year.
Status lifecycle: draft  →  active  →  archived
Exactly ONE policy may have status="active" at any time (enforced in policy_engine.py).
Archived policies are immutable — the API rejects any write attempt after archival.
"""

import json
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import Column, DateTime, Float, Integer, String, Text
from sqlalchemy.sql import func

from app.models.base import Base


# ── Default slab data (FY 2025-26, Budget 2025) ───────────────────────────────

_DEFAULT_OLD_SLABS: List[Dict[str, Any]] = [
    {"min": 0,       "max": 250000,   "rate": 0.00},
    {"min": 250001,  "max": 500000,   "rate": 0.05},
    {"min": 500001,  "max": 1000000,  "rate": 0.20},
    {"min": 1000001, "max": None,     "rate": 0.30},
]

_DEFAULT_NEW_SLABS: List[Dict[str, Any]] = [
    {"min": 0,       "max": 400000,   "rate": 0.00},
    {"min": 400001,  "max": 800000,   "rate": 0.05},
    {"min": 800001,  "max": 1200000,  "rate": 0.10},
    {"min": 1200001, "max": 1600000,  "rate": 0.15},
    {"min": 1600001, "max": 2000000,  "rate": 0.20},
    {"min": 2000001, "max": None,     "rate": 0.30},
]

_DEFAULT_DEDUCTION_LIMITS: Dict[str, float] = {
    "80C":              150000.0,
    "80D_general":       25000.0,
    "80D_senior":        50000.0,
    "80TTA":             10000.0,
    "80TTB":             50000.0,
    "80CCD_1B":          50000.0,
    "HRA_max_percent":       0.50,   # 50 % of basic salary
}

_DEFAULT_ELIGIBILITY_FLAGS: Dict[str, Any] = {
    "senior_citizen_age":       60,
    "super_senior_citizen_age": 80,
    "new_regime_std_deduction": True,
}


class TaxPolicy(Base):
    __tablename__ = "tax_policies"

    # ── Identity ──────────────────────────────────────────────────────────────
    id              = Column(Integer, primary_key=True, index=True)
    financial_year  = Column(String(20), nullable=False)   # e.g. "FY 2025-26"
    version         = Column(String(10), nullable=False)   # "v1", "v2" …
    status          = Column(String(10), default="draft")  # draft | active | archived
    notes           = Column(String(500), nullable=True)

    # ── Effective dates ───────────────────────────────────────────────────────
    effective_from  = Column(String(10), nullable=True)    # ISO-8601 date "2025-04-01"
    effective_to    = Column(String(10), nullable=True)    # ISO-8601 date "2026-03-31"
    filing_deadline = Column(String(10), nullable=True)    # ISO-8601 date

    # ── Flat scalar limits ────────────────────────────────────────────────────
    standard_deduction          = Column(Float, default=75000.0)
    old_regime_rebate_limit     = Column(Float, default=500000.0)
    old_regime_rebate_amount    = Column(Float, default=12500.0)
    new_regime_rebate_limit     = Column(Float, default=1200000.0)
    new_regime_rebate_amount    = Column(Float, default=60000.0)
    cess_rate                   = Column(Float, default=0.04)

    # ── JSON blobs (stored as TEXT for SQLite compat) ─────────────────────────
    deduction_limits_json   = Column(Text, nullable=True)  # Dict[str, float]
    old_regime_slabs_json   = Column(Text, nullable=True)  # List[{min,max,rate}]
    new_regime_slabs_json   = Column(Text, nullable=True)  # List[{min,max,rate}]
    eligibility_flags_json  = Column(Text, nullable=True)  # Dict[str, Any]

    # ── Audit timestamps ──────────────────────────────────────────────────────
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), onupdate=func.now())
    activated_at = Column(DateTime(timezone=True), nullable=True)
    archived_at  = Column(DateTime(timezone=True), nullable=True)
    created_by   = Column(Integer, nullable=True)   # foreign key → users.id (soft ref)

    # ── Helpers ───────────────────────────────────────────────────────────────
    def _load(self, field: str, default: Any) -> Any:
        raw = getattr(self, field)
        if raw is None:
            return default
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return default

    @property
    def deduction_limits(self) -> Dict[str, float]:
        return self._load("deduction_limits_json", _DEFAULT_DEDUCTION_LIMITS)

    @property
    def old_regime_slabs(self) -> List[Dict[str, Any]]:
        return self._load("old_regime_slabs_json", _DEFAULT_OLD_SLABS)

    @property
    def new_regime_slabs(self) -> List[Dict[str, Any]]:
        return self._load("new_regime_slabs_json", _DEFAULT_NEW_SLABS)

    @property
    def eligibility_flags(self) -> Dict[str, Any]:
        return self._load("eligibility_flags_json", _DEFAULT_ELIGIBILITY_FLAGS)

    def to_context_dict(self) -> Dict[str, Any]:
        """Serialisable summary injected into every AI reasoning prompt."""
        return {
            "policy_id":            self.id,
            "financial_year":       self.financial_year,
            "version":              self.version,
            "effective_from":       self.effective_from,
            "effective_to":         self.effective_to,
            "filing_deadline":      self.filing_deadline,
            "standard_deduction":   self.standard_deduction,
            "deduction_limits":     self.deduction_limits,
            "old_regime": {
                "slabs":            self.old_regime_slabs,
                "rebate_limit":     self.old_regime_rebate_limit,
                "rebate_amount":    self.old_regime_rebate_amount,
            },
            "new_regime": {
                "slabs":            self.new_regime_slabs,
                "rebate_limit":     self.new_regime_rebate_limit,
                "rebate_amount":    self.new_regime_rebate_amount,
            },
            "cess_rate":            self.cess_rate,
            "eligibility_flags":    self.eligibility_flags,
        }
