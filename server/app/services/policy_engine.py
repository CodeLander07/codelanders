"""
TaxMate — Policy Engine Service
================================

Single source of truth for all policy state operations.

Responsibilities
----------------
- activate_policy   : atomically switches the active policy
- get_active_policy : returns the current DB-level active policy (never cached)
- archive_policy    : marks a policy immutable
- seed_default      : creates the default FY 2025-26 policy on first boot if none exist
- get_active_context: returns ActivePolicyContext or None (used by tax/AI engines)

Design contract
---------------
- Exactly ONE policy may be ACTIVE at a time — enforced with a DB transaction.
- Archived policies are IMMUTABLE — any write attempt raises ValueError.
- If policy state is ambiguous (> 1 active) the engine raises PolicyStateError.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.tax_policy import TaxPolicy, _DEFAULT_DEDUCTION_LIMITS, _DEFAULT_ELIGIBILITY_FLAGS
from app.schemas.tax_policy import ActivePolicyContext, TaxPolicyCreate, TaxPolicyUpdate

logger = logging.getLogger(__name__)


# ─── Custom exceptions ────────────────────────────────────────────────────────

class PolicyStateError(Exception):
    """Raised when the policy table is in an inconsistent state."""


class PolicyImmutableError(Exception):
    """Raised when attempting to modify an archived policy."""


class PolicyNotFoundError(Exception):
    """Raised when a policy ID does not exist."""


# ─── Internal helpers ─────────────────────────────────────────────────────────

def _serialise(value) -> Optional[str]:
    """Convert dict/list to JSON string, or None."""
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return json.dumps(
        # Pydantic BaseModel list → convert to plain dicts
        [s.model_dump() if hasattr(s, "model_dump") else s for s in value]
        if isinstance(value, list)
        else value
    )


def _apply_create(policy: TaxPolicy, data: TaxPolicyCreate) -> None:
    policy.financial_year           = data.financial_year
    policy.version                  = data.version
    policy.notes                    = data.notes
    policy.effective_from           = data.effective_from
    policy.effective_to             = data.effective_to
    policy.filing_deadline          = data.filing_deadline
    policy.standard_deduction       = data.standard_deduction
    policy.old_regime_rebate_limit  = data.old_regime_rebate_limit
    policy.old_regime_rebate_amount = data.old_regime_rebate_amount
    policy.new_regime_rebate_limit  = data.new_regime_rebate_limit
    policy.new_regime_rebate_amount = data.new_regime_rebate_amount
    policy.cess_rate                = data.cess_rate
    policy.deduction_limits_json    = _serialise(data.deduction_limits or _DEFAULT_DEDUCTION_LIMITS)
    policy.old_regime_slabs_json    = _serialise(data.old_regime_slabs)
    policy.new_regime_slabs_json    = _serialise(data.new_regime_slabs)
    policy.eligibility_flags_json   = _serialise(data.eligibility_flags or _DEFAULT_ELIGIBILITY_FLAGS)


# ─── CRUD operations ──────────────────────────────────────────────────────────

def create_policy(db: Session, data: TaxPolicyCreate, created_by: Optional[int] = None) -> TaxPolicy:
    """Create a new DRAFT policy."""
    policy = TaxPolicy(status="draft", created_by=created_by)
    _apply_create(policy, data)
    db.add(policy)
    db.commit()
    db.refresh(policy)
    logger.info("Created draft policy id=%s fy=%s v=%s", policy.id, policy.financial_year, policy.version)
    return policy


def update_policy(db: Session, policy_id: int, data: TaxPolicyUpdate) -> TaxPolicy:
    """Update a DRAFT policy. Raises PolicyImmutableError for archived policies."""
    policy = _get_or_404(db, policy_id)
    if policy.status == "archived":
        raise PolicyImmutableError(f"Policy {policy_id} is archived and cannot be modified.")
    if policy.status == "active":
        raise PolicyImmutableError(f"Policy {policy_id} is active. Archive it first to make changes.")

    fields = data.model_dump(exclude_none=True)
    json_mappings = {
        "deduction_limits": "deduction_limits_json",
        "old_regime_slabs": "old_regime_slabs_json",
        "new_regime_slabs": "new_regime_slabs_json",
        "eligibility_flags": "eligibility_flags_json",
    }
    for key, value in fields.items():
        if key in json_mappings:
            setattr(policy, json_mappings[key], _serialise(value))
        else:
            setattr(policy, key, value)

    db.commit()
    db.refresh(policy)
    logger.info("Updated draft policy id=%s", policy_id)
    return policy


def activate_policy(db: Session, policy_id: int) -> tuple[TaxPolicy, Optional[int]]:
    """
    Atomic activation:
    1. Set all other "active" policies to "archived".
    2. Set the target policy to "active".
    Returns (new_active_policy, previously_active_policy_id | None).
    """
    target = _get_or_404(db, policy_id)
    if target.status == "archived":
        raise PolicyImmutableError(f"Policy {policy_id} is archived and cannot be activated.")

    # Find currently active (may be None)
    previously_active = db.query(TaxPolicy).filter(TaxPolicy.status == "active").first()
    prev_id = previously_active.id if previously_active else None

    # Archive the previously active policy (if different)
    if previously_active and previously_active.id != policy_id:
        previously_active.status = "archived"
        previously_active.archived_at = datetime.now(timezone.utc)
        logger.info("Auto-archived previous active policy id=%s", prev_id)

    # Activate target
    target.status = "active"
    target.activated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(target)

    logger.info("Activated policy id=%s fy=%s v=%s", target.id, target.financial_year, target.version)
    return target, prev_id


def archive_policy(db: Session, policy_id: int) -> TaxPolicy:
    """Manually archive a DRAFT or ACTIVE policy."""
    policy = _get_or_404(db, policy_id)
    if policy.status == "archived":
        return policy  # idempotent
    policy.status = "archived"
    policy.archived_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(policy)
    logger.info("Archived policy id=%s", policy_id)
    return policy


def list_policies(db: Session) -> list[TaxPolicy]:
    return db.query(TaxPolicy).order_by(TaxPolicy.created_at.desc()).all()


def get_policy(db: Session, policy_id: int) -> TaxPolicy:
    return _get_or_404(db, policy_id)


# ─── Active policy ────────────────────────────────────────────────────────────

def get_active_policy(db: Session) -> Optional[TaxPolicy]:
    """Return the single active policy, or None if none is active."""
    active_policies = db.query(TaxPolicy).filter(TaxPolicy.status == "active").all()
    if len(active_policies) > 1:
        logger.error("Policy state error: %d active policies found", len(active_policies))
        raise PolicyStateError("Multiple active policies detected — contact system administrator.")
    return active_policies[0] if active_policies else None


def get_active_context(db: Session) -> Optional[ActivePolicyContext]:
    """
    Return an ActivePolicyContext for injection into AI / tax engine calls.
    Returns None if no policy is active.
    """
    policy = get_active_policy(db)
    if policy is None:
        return None
    ctx = policy.to_context_dict()
    return ActivePolicyContext(**ctx)


# ─── Default seed ─────────────────────────────────────────────────────────────

def seed_default_policy(db: Session) -> None:
    """
    Called at application startup.
    Creates the default FY 2025-26 active policy if no policies exist at all.
    Safe to call on every startup (idempotent).
    """
    existing = db.query(TaxPolicy).count()
    if existing > 0:
        return

    logger.info("No policies found — seeding default FY 2025-26 policy.")
    data = TaxPolicyCreate(
        financial_year  = "FY 2025-26",
        version         = "v1",
        notes           = "Default policy for FY 2025-26 (Budget 2025). Auto-seeded at first boot.",
        effective_from  = "2025-04-01",
        effective_to    = "2026-03-31",
        filing_deadline = "2025-07-31",
        standard_deduction          = 75000.0,
        old_regime_rebate_limit     = 500000.0,
        old_regime_rebate_amount    = 12500.0,
        new_regime_rebate_limit     = 1200000.0,
        new_regime_rebate_amount    = 60000.0,
        cess_rate                   = 0.04,
    )
    policy = create_policy(db, data, created_by=None)
    activate_policy(db, policy.id)
    logger.info("Default policy id=%s activated.", policy.id)


# ─── Internal ─────────────────────────────────────────────────────────────────

def _get_or_404(db: Session, policy_id: int) -> TaxPolicy:
    policy = db.query(TaxPolicy).filter(TaxPolicy.id == policy_id).first()
    if policy is None:
        raise PolicyNotFoundError(f"Policy {policy_id} not found.")
    return policy
