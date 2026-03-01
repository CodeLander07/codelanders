from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.models.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    # Basic Profile Info
    full_name = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    aadhar_number = Column(String, nullable=True) # Needs encryption in a real prod scenario
    pan_number = Column(String, nullable=True)
    mobile_number = Column(String, nullable=True)
    employment_type = Column(String, nullable=True) # Salaried / Self-employed / Freelancer / Business / Student
    residential_status = Column(String, nullable=True) # Resident / NRI
    state_of_residence = Column(String, nullable=True)
    disability_status = Column(String, nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
class Questionnaire(Base):
    __tablename__ = "questionnaires"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    
    # Yes/No detailed checks
    own_land = Column(Boolean, default=False)
    earn_rent = Column(Boolean, default=False)
    sell_property = Column(Boolean, default=False)
    sell_stocks = Column(Boolean, default=False)
    run_business = Column(Boolean, default=False)
    is_trader = Column(Boolean, default=False)
    agricultural_income = Column(Boolean, default=False)
    
    # Expenses (stored as JSON string or dedicated columns. Using strings/JSON for simplicity if using Postgres, but for SQLite let's use String as JSON dump)
    housing_data = Column(String, nullable=True)
    education_data = Column(String, nullable=True)
    health_data = Column(String, nullable=True)
    retirement_data = Column(String, nullable=True)
    charity_data = Column(String, nullable=True)
    energy_data = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
