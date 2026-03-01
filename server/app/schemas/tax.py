from pydantic import BaseModel
from typing import Dict, Any, Optional

class TaxCalculationRequest(BaseModel):
    # Optional because we might pull from DB
    age: Optional[int] = 30
    income_details: Dict[str, float] = {"salary": 0}
    deductions: Dict[str, float] = {}

class TaxCalculationResponse(BaseModel):
    gross_income: float
    old_regime: Dict[str, Any]
    new_regime: Dict[str, Any]
    recommendation: str
    potential_savings: float
