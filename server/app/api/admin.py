"""
TaxMate — Admin Panel API Router
=================================

All endpoints require the  X-Admin-Key  header matching `settings.ADMIN_SECRET_KEY`.
No user data is accessed or modified by these endpoints.

Route map
---------
GET    /admin/policies              → list all policies (all statuses)
POST   /admin/policies              → create a new DRAFT policy
GET    /admin/policies/active       → get the current ACTIVE policy (or 404)
GET    /admin/policies/{id}         → get a single policy
PUT    /admin/policies/{id}         → update a DRAFT (not active/archived)
POST   /admin/policies/{id}/activate → activate policy (auto-archives previous active)
POST   /admin/policies/{id}/archive  → manually archive a policy
DELETE /admin/policies/{id}         → delete a DRAFT only
"""

from typing import List

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.schemas.tax_policy import (
    ActivationResult,
    ActivePolicyContext,
    TaxPolicyCreate,
    TaxPolicyResponse,
    TaxPolicyUpdate,
)
from app.services.policy_engine import (
    PolicyImmutableError,
    PolicyNotFoundError,
    PolicyStateError,
    activate_policy,
    archive_policy,
    create_policy,
    get_active_context,
    get_active_policy,
    get_policy,
    list_policies,
    update_policy,
)

router = APIRouter()


# ─── Admin auth dependency ────────────────────────────────────────────────────

def verify_admin(x_admin_key: str = Header(..., alias="X-Admin-Key")) -> None:
    """
    Validate the X-Admin-Key header.
    Set ADMIN_SECRET_KEY in your .env file for production deployments.
    """
    if x_admin_key != settings.ADMIN_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid admin key.",
        )


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _policy_response(policy) -> TaxPolicyResponse:
    return TaxPolicyResponse.from_orm(policy)


def _handle_engine_errors(exc: Exception) -> None:
    if isinstance(exc, PolicyNotFoundError):
        raise HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, PolicyImmutableError):
        raise HTTPException(status_code=409, detail=str(exc))
    if isinstance(exc, PolicyStateError):
        raise HTTPException(status_code=500, detail=str(exc))
    raise exc


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get(
    "/policies",
    response_model=List[TaxPolicyResponse],
    summary="List all tax policies",
    dependencies=[Depends(verify_admin)],
)
def list_all_policies(db: Session = Depends(get_db)):
    return [_policy_response(p) for p in list_policies(db)]


@router.post(
    "/policies",
    response_model=TaxPolicyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new DRAFT policy",
    dependencies=[Depends(verify_admin)],
)
def create_draft_policy(data: TaxPolicyCreate, db: Session = Depends(get_db)):
    policy = create_policy(db, data)
    return _policy_response(policy)


@router.get(
    "/policies/active",
    response_model=TaxPolicyResponse,
    summary="Get the currently active policy",
    dependencies=[Depends(verify_admin)],
)
def get_current_active(db: Session = Depends(get_db)):
    try:
        policy = get_active_policy(db)
    except PolicyStateError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    if policy is None:
        raise HTTPException(status_code=404, detail="No active policy found.")
    return _policy_response(policy)


@router.get(
    "/policies/{policy_id}",
    response_model=TaxPolicyResponse,
    summary="Get a single policy by ID",
    dependencies=[Depends(verify_admin)],
)
def get_single_policy(policy_id: int, db: Session = Depends(get_db)):
    try:
        return _policy_response(get_policy(db, policy_id))
    except Exception as exc:
        _handle_engine_errors(exc)


@router.put(
    "/policies/{policy_id}",
    response_model=TaxPolicyResponse,
    summary="Update a DRAFT policy",
    dependencies=[Depends(verify_admin)],
)
def update_draft_policy(policy_id: int, data: TaxPolicyUpdate, db: Session = Depends(get_db)):
    try:
        return _policy_response(update_policy(db, policy_id, data))
    except Exception as exc:
        _handle_engine_errors(exc)


@router.post(
    "/policies/{policy_id}/activate",
    response_model=ActivationResult,
    summary="Activate a policy (auto-archives the previously active one)",
    dependencies=[Depends(verify_admin)],
)
def activate(policy_id: int, db: Session = Depends(get_db)):
    try:
        new_active, prev_id = activate_policy(db, policy_id)
        return ActivationResult(
            activated_policy_id=new_active.id,
            deactivated_policy_id=prev_id,
            message=(
                f"Policy {new_active.id} ({new_active.financial_year} {new_active.version}) "
                f"is now ACTIVE."
                + (f" Previous policy {prev_id} has been archived." if prev_id else "")
            ),
        )
    except Exception as exc:
        _handle_engine_errors(exc)


@router.post(
    "/policies/{policy_id}/archive",
    response_model=TaxPolicyResponse,
    summary="Manually archive a policy",
    dependencies=[Depends(verify_admin)],
)
def archive(policy_id: int, db: Session = Depends(get_db)):
    try:
        return _policy_response(archive_policy(db, policy_id))
    except Exception as exc:
        _handle_engine_errors(exc)


@router.delete(
    "/policies/{policy_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a DRAFT policy (cannot delete active or archived)",
    dependencies=[Depends(verify_admin)],
)
def delete_policy(policy_id: int, db: Session = Depends(get_db)):
    try:
        policy = get_policy(db, policy_id)
    except PolicyNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    if policy.status != "draft":
        raise HTTPException(
            status_code=409,
            detail=f"Policy {policy_id} has status '{policy.status}' and cannot be deleted. "
                   "Only DRAFT policies may be deleted.",
        )
    from sqlalchemy.orm import Session as _S
    from app.models.tax_policy import TaxPolicy
    db.query(TaxPolicy).filter(TaxPolicy.id == policy_id).delete()
    db.commit()


# ─── Public (no admin key) — active policy context for engines ─────────────────

@router.get(
    "/active-context",
    response_model=ActivePolicyContext,
    summary="Get the active policy context (used internally by tax engine and AI)",
    include_in_schema=False,    # not documented in Swagger for end users
)
def active_context_for_engines(db: Session = Depends(get_db)):
    """
    Internal endpoint consumed by frontend analytics and tax calculation.
    Does NOT require admin key — it returns only derived, non-sensitive policy data.
    Returns 404 with { "reason": "policy_not_active" } when no policy is active.
    """
    try:
        ctx = get_active_context(db)
    except PolicyStateError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    if ctx is None:
        raise HTTPException(
            status_code=404,
            detail={"reason": "policy_not_active", "message": "No active tax policy found."},
        )
    return ctx
