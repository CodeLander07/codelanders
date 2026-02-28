from pydantic import BaseModel, EmailStr


class SignUpRequest(BaseModel):
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str
    password: str


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class SignInResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr


class MessageResponse(BaseModel):
    message: str
