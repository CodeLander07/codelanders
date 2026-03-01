from fastapi import APIRouter
from app.api import auth, profile, tax, documents

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(profile.router, prefix="/profile", tags=["profile"])
api_router.include_router(tax.router, prefix="/tax", tags=["tax"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
