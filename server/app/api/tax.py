from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User, Questionnaire
from app.schemas.tax import TaxCalculationRequest, TaxCalculationResponse
from app.api.auth import get_current_user
from app.services.tax_engine import TaxEngine
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
    If not provided, attempts to infer from user profile and questionnaire.
    """
    age = request.age or current_user.age or 30
    income_details = request.income_details
    deductions = request.deductions
    
    # Simple inference if deductions are empty but questionnaire exists
    if not deductions:
        q = db.query(Questionnaire).filter(Questionnaire.user_id == current_user.id).first()
        if q:
            # Example heuristic mapping:
            if q.housing_data:
                # Assuming housing_data contains JSON string with rent amount
                try:
                    h_data = json.loads(q.housing_data)
                    if "rent_paid_yearly" in h_data:
                        # rough HRA estimation
                        deductions["hra"] = h_data["rent_paid_yearly"] * 0.5
                except:
                    pass
            if q.health_data:
                try:
                    med_data = json.loads(q.health_data)
                    if "insurance_premium" in med_data:
                        deductions["80d"] = min(med_data["insurance_premium"], 25000)
                except:
                    pass
    
    engine = TaxEngine(age=age, income_details=income_details, deductions=deductions)
    result = engine.get_recommendation()
    
    return result
