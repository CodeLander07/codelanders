import os
import resend
from datetime import datetime

resend.api_key = os.environ.get("RESEND_API_KEY")


def send_otp_email(to_email: str, otp_code: str) -> dict | None:
    """Send OTP verification email via Resend."""
    if not resend.api_key:
        raise ValueError("RESEND_API_KEY is not set")

    params: resend.Emails.SendParams = {
        "from": "TaxMate <onboarding@resend.dev>",
        "to": [to_email],
        "subject": "Your TaxMate verification code",
        "html": f"""
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">Verify your email</h2>
            <p style="color: #4a4a4a; font-size: 16px;">
                Your verification code is:
            </p>
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a; background: #f0f0f0; padding: 16px; border-radius: 8px; text-align: center;">
                {otp_code}
            </p>
            <p style="color: #888; font-size: 14px;">
                This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
            </p>
            <p style="color: #888; font-size: 14px;">
                — The TaxMate Team
            </p>
        </div>
        """,
    }
    return resend.Emails.send(params)
