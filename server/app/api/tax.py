from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User, Questionnaire
from app.schemas.tax import TaxCalculationRequest, TaxCalculationResponse
from app.api.auth import get_current_user
from app.services.tax_engine import TaxEngine
from app.services.policy_engine import get_active_context, PolicyStateError
import json

router = APIRouter()

@router.post("/calculate", response_model=TaxCalculationResponse)
def calculate_tax(
    request: TaxCalculationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Given income details and deductions, calculates the best tax regime.
    Uses the ACTIVE tax policy for slabs, rebates, and deduction limits.
    Returns 503 if no active policy exists.
    """
    # ── Resolve active policy ────────────────────────────────────────────────
    try:
        policy_ctx = get_active_context(db)
    except PolicyStateError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if policy_ctx is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "blocked", "reason": "policy_not_active"},
        )

    age = request.age or current_user.age or 30
    income_details = request.income_details
    deductions = request.deductions

    # Simple inference if deductions are empty but questionnaire exists
    if not deductions:
        q = db.query(Questionnaire).filter(Questionnaire.user_id == current_user.id).first()
        if q:
            if q.housing_data:
                try:
                    h_data = json.loads(q.housing_data)
                    if "rent_paid_yearly" in h_data:
                        deductions["hra"] = h_data["rent_paid_yearly"] * 0.5
                except Exception:
                    pass
            if q.health_data:
                try:
                    med_data = json.loads(q.health_data)
                    if "insurance_premium" in med_data:
                        deductions["80d"] = min(med_data["insurance_premium"], 25000)
                except Exception:
                    pass

    engine = TaxEngine(
        age=age,
        income_details=income_details,
        deductions=deductions,
        policy=policy_ctx,          # ← active policy injected here
    )
    return engine.get_recommendation()
