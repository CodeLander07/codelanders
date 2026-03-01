"""
TaxMate — Documents API
=======================
Handles secure upload, background pipeline execution, and result retrieval.

Pipeline stages
---------------
queued → ocr → validating → calculating → analyzing → complete | failed

After every successful upload the full 5-step pipeline is triggered automatically
in a FastAPI BackgroundTask.  The frontend polls GET /pipeline/{task_id} until
pipeline_stage == "complete" or "failed".
"""

from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from app.api.auth import get_current_user
from app.db.session import SessionLocal
from app.models.user import User
from app.services.pipeline import (
    run_pipeline,
    initial_record,
    USER_PIPELINE_RESULTS,
)
from app.core.config import settings
import os
import uuid
import shutil
from typing import Any, Dict

router = APIRouter()

# Back-compat alias — used by insights.py which imported USER_DOC_RESULTS
USER_DOC_RESULTS: Dict[int, Dict[str, Any]] = USER_PIPELINE_RESULTS   # type: ignore[assignment]

_ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".csv", ".xlsx"}


def _run_pipeline_bg(
    file_path: str,
    filename: str,
    user_id: int,
    task_id: str,
) -> None:
    """
    Background runner — creates its own DB session so it is not tied to the
    request lifecycle.  The session is closed when the pipeline finishes.
    """
    db: Session = SessionLocal()
    try:
        run_pipeline(file_path, filename, user_id, task_id, db)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# POST /upload
# ---------------------------------------------------------------------------
@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Secure document upload endpoint.

    Accepts: PDF, PNG, JPG, CSV, XLSX.
    The file is saved to a temporary path, then the full 5-step pipeline
    (OCR → validate → calculate → analyse → complete) runs in the background.

    Returns a task_id — poll GET /pipeline/{task_id} for live stage updates.
    """
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(_ALLOWED_EXTENSIONS))}",
        )

    task_id   = str(uuid.uuid4())
    safe_name = f"{task_id}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_name)

    with open(file_path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    # Create the initial "queued" record immediately so the frontend can start
    # polling without waiting for the background task to start.
    initial_record(current_user.id, task_id, file.filename or safe_name)

    background_tasks.add_task(
        _run_pipeline_bg,
        file_path,
        file.filename or safe_name,
        current_user.id,
        task_id,
    )

    return {
        "message":  "File uploaded. Full pipeline is running in the background.",
        "task_id":  task_id,
        "filename": file.filename,
        "pipeline_stage": "queued",
    }


# ---------------------------------------------------------------------------
# GET /pipeline/{task_id}  — primary polling endpoint
# ---------------------------------------------------------------------------
@router.get("/pipeline/{task_id}")
def get_pipeline_status(
    task_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Poll the full pipeline state for a single document task.

    Response shape (when running):
      { "pipeline_stage": "ocr | validating | calculating | analyzing", ... }

    Response shape (when complete):
      {
        "pipeline_stage": "complete",
        "document_type": "...",
        "extraction":     { ...ExtractionResult fields... },
        "calculations":   { ...TaxEngine.get_recommendation()... },
        "analysis":       { ...AnalysisResponse... },
        "ollama":         { "status": "complete|pending", "insights": [...] }
      }

    Response shape (when failed):
      { "pipeline_stage": "failed", "error": "..." }
    """
    user_results = USER_PIPELINE_RESULTS.get(current_user.id, {})
    if task_id not in user_results:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found.")
    return user_results[task_id]


# ---------------------------------------------------------------------------
# GET /pipeline  — all pipeline results for the current user
# ---------------------------------------------------------------------------
@router.get("/pipeline")
def get_all_pipeline_results(current_user: User = Depends(get_current_user)):
    """
    Return all pipeline results for the authenticated user, keyed by task_id.
    Useful for the frontend to rebuild state after a hard refresh.
    """
    return USER_PIPELINE_RESULTS.get(current_user.id, {})


# ---------------------------------------------------------------------------
# GET /status/{task_id}  — DEPRECATED, kept for back-compat
# ---------------------------------------------------------------------------
@router.get("/status/{task_id}")
def get_document_status(
    task_id: str,
    current_user: User = Depends(get_current_user),
):
    """Legacy polling endpoint — prefer GET /pipeline/{task_id}."""
    user_results = USER_PIPELINE_RESULTS.get(current_user.id, {})
    if task_id in user_results:
        r = user_results[task_id]
        # Map pipeline stage to old-style status
        stage = r.get("pipeline_stage", "processing")
        legacy_status = {
            "queued":      "processing",
            "ocr":         "processing",
            "validating":  "processing",
            "calculating": "processing",
            "analyzing":   "processing",
            "complete":    r.get("ocr_status", "parsed"),
            "failed":      "failed",
        }.get(stage, "processing")
        return {**r, "status": legacy_status}
    return {"task_id": task_id, "status": "processing"}


# ---------------------------------------------------------------------------
# GET /results  — back-compat alias
# ---------------------------------------------------------------------------
@router.get("/results")
def get_all_results(current_user: User = Depends(get_current_user)):
    """Legacy bulk-results endpoint — prefer GET /pipeline."""
    return USER_PIPELINE_RESULTS.get(current_user.id, {})


# ---------------------------------------------------------------------------
# DELETE /results/{task_id}
# ---------------------------------------------------------------------------
@router.delete("/results/{task_id}")
def delete_result(
    task_id: str,
    current_user: User = Depends(get_current_user),
):
    """Remove a cached pipeline result."""
    user_results = USER_PIPELINE_RESULTS.get(current_user.id, {})
    if task_id not in user_results:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found.")
    del user_results[task_id]
    return {"message": f"Task '{task_id}' deleted."}

# ---------------------------------------------------------------------------
@router.delete("/results/{task_id}")
def delete_result(task_id: str, current_user: User = Depends(get_current_user)):
    """
    Remove a single extraction result from the in-memory store.
    Raw file is already deleted by the extraction engine; this only
    discards the cached structured output.
    """
    user_results = USER_DOC_RESULTS.get(current_user.id, {})
    if task_id not in user_results:
        raise HTTPException(status_code=404, detail="Task not found.")
    del user_results[task_id]
    return {"message": "Result removed.", "task_id": task_id}
