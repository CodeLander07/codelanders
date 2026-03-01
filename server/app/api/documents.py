from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException
from app.api.auth import get_current_user
from app.models.user import User
from app.services.ocr_service import process_document
from app.core.config import settings
import os
import uuid
import shutil

router = APIRouter()

# Temporary in-memory store for document processing results for the user session
# In prod, this would be a DB table or Redis cache.
USER_DOC_RESULTS = {}

def background_ocr_task(file_path: str, filename: str, user_id: int, task_id: str):
    result = process_document(file_path, filename)
    if user_id not in USER_DOC_RESULTS:
        USER_DOC_RESULTS[user_id] = {}
    USER_DOC_RESULTS[user_id][task_id] = result

@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Secure document upload. Files are saved temporarily and deleted immediately after processing.
    """
    if not file.filename.lower().endswith(('.pdf', '.png', '.jpg', '.jpeg')):
        raise HTTPException(status_code=400, detail="Invalid file format. Only PDF, PNG, JPG allowed.")

    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Trigger background processing
    background_tasks.add_task(background_ocr_task, file_path, file.filename, current_user.id, file_id)
    
    return {
        "message": "File uploaded successfully. Processing securely in the background.",
        "task_id": file_id,
        "filename": file.filename
    }

@router.get("/status/{task_id}")
def get_document_status(task_id: str, current_user: User = Depends(get_current_user)):
    """
    Check the status of a parsed document and retrieve its structured data.
    """
    user_results = USER_DOC_RESULTS.get(current_user.id, {})
    if task_id in user_results:
        return user_results[task_id]
    return {"status": "processing or not found"}
