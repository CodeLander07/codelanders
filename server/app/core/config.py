from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "TaxMate API"
    # Fallback to local SQLite if DATABASE_URL is not set
    SQLALCHEMY_DATABASE_URI: str = os.getenv("DATABASE_URL", "sqlite:///./taxmate.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-for-taxmate-change-in-prod")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120  # 2 hours for session
    
    # ChromaDB (Vector DB)
    CHROMA_PERSIST_DIRECTORY: str = "./chroma_db"
    
    # Local fallback for document uploads
    UPLOAD_DIR: str = "./uploads"

    class Config:
        env_file = ".env"

settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.CHROMA_PERSIST_DIRECTORY, exist_ok=True)
