from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class QuestionnaireBase(BaseModel):
    own_land: bool = False
    earn_rent: bool = False
    sell_property: bool = False
    sell_stocks: bool = False
    run_business: bool = False
    is_trader: bool = False
    agricultural_income: bool = False

    # For structured JSON strings or dictionaries in API
    housing_data: Optional[str] = None
    education_data: Optional[str] = None
    health_data: Optional[str] = None
    retirement_data: Optional[str] = None
    charity_data: Optional[str] = None
    energy_data: Optional[str] = None

class QuestionnaireCreate(QuestionnaireBase):
    pass

class QuestionnaireUpdate(QuestionnaireBase):
    pass

class QuestionnaireInDBBase(QuestionnaireBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        orm_mode = True

class Questionnaire(QuestionnaireInDBBase):
    pass
