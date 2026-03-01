from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict

# Shared properties
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    age: Optional[int] = None
    aadhar_number: Optional[str] = None
    pan_number: Optional[str] = None
    mobile_number: Optional[str] = None
    employment_type: Optional[str] = None
    residential_status: Optional[str] = None
    state_of_residence: Optional[str] = None
    disability_status: Optional[str] = None

# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str

# Properties to receive via API on update
class UserUpdate(UserBase):
    password: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserInDBBase(UserBase):
    id: Optional[int] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# Additional properties to return via API
class User(UserInDBBase):
    pass

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User
