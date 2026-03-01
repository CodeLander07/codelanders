from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine
from app.models import base
from app.models.user import User, Questionnaire
from app.models.tax_policy import TaxPolicy  # ensure table is created

# Create database tables
base.Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)

from app.api.api import api_router

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"], # Explicitly allow frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

# ── Startup: seed default policy if none exist ───────────────────────────────
from app.db.session import SessionLocal
from app.services.policy_engine import seed_default_policy

@app.on_event("startup")
def startup_seed():
    db = SessionLocal()
    try:
        seed_default_policy(db)
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Welcome to TaxMate API. Navigate to /docs for Swagger UI."}
