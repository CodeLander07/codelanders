import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User, OTPVerification
from schemas import SignUpRequest, VerifyOTPRequest, SignInRequest, SignInResponse, MessageResponse, ResetPasswordRequest
from auth import get_password_hash, verify_password, create_access_token, decode_access_token
from services.email import send_otp_email

router = APIRouter(tags=["auth"])


def generate_otp() -> str:
    return "".join(secrets.choice("0123456789") for _ in range(6))


@router.post("/signup", response_model=MessageResponse)
async def signup(req: SignUpRequest, db: AsyncSession = Depends(get_db)):
    """Send OTP to email for verification."""
    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    otp = generate_otp()
    otp_record = OTPVerification(
        email=req.email,
        otp_code=otp,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    )
    db.add(otp_record)
    await db.commit()

    try:
        send_otp_email(req.email, otp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

    return MessageResponse(message="Verification code sent to your email")


@router.post("/verify-otp", response_model=MessageResponse)
async def verify_otp(req: VerifyOTPRequest, db: AsyncSession = Depends(get_db)):
    """Verify OTP and create user with password."""
    result = await db.execute(
        select(OTPVerification)
        .where(
            OTPVerification.email == req.email,
            OTPVerification.otp_code == req.otp,
            OTPVerification.used == False,
            OTPVerification.expires_at > datetime.utcnow(),
        )
    )
    otp_record = result.scalar_one_or_none()
    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=req.email,
        password_hash=get_password_hash(req.password),
        email_verified=True,
    )
    db.add(user)
    otp_record.used = True
    await db.commit()

    return MessageResponse(message="Account created. Please sign in.")


@router.post("/signin", response_model=SignInResponse)
async def signin(req: SignInRequest, db: AsyncSession = Depends(get_db)):
    """Sign in with email and password."""
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(data={"sub": user.email})
    return SignInResponse(access_token=token, email=user.email)


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(req: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Send password reset OTP (simplified - in production use dedicated reset flow)."""
    result = await db.execute(select(User).where(User.email == req.email))
    if not result.scalar_one_or_none():
        return MessageResponse(message="If the email exists, a reset link has been sent")

    otp = generate_otp()
    otp_record = OTPVerification(
        email=req.email,
        otp_code=otp,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    )
    db.add(otp_record)
    await db.commit()

    try:
        send_otp_email(req.email, otp)
    except Exception:
        pass

    return MessageResponse(message="If the email exists, a reset code has been sent")
