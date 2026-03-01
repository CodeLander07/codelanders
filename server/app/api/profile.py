from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User, Questionnaire
from app.schemas.user import UserUpdate, User as UserSchema
from app.schemas.questionnaire import QuestionnaireCreate, Questionnaire as QuestionnaireSchema
from app.api.auth import get_current_user

router = APIRouter()

@router.put("/me", response_model=UserSchema)
def update_user_profile(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update own user profile.
    """
    update_data = user_in.dict(exclude_unset=True)
    if "password" in update_data:
        from app.core.security import get_password_hash
        update_data["hashed_password"] = get_password_hash(update_data["password"])
        del update_data["password"]

    for field, value in update_data.items():
        setattr(current_user, field, value)
        
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/questionnaire", response_model=QuestionnaireSchema)
def submit_questionnaire(
    questionnaire_in: QuestionnaireCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit or update user tax questionnaire data.
    """
    # Check if a questionnaire already exists for the user
    existing_questionnaire = db.query(Questionnaire).filter(Questionnaire.user_id == current_user.id).first()
    
    if existing_questionnaire:
        # Update
        update_data = questionnaire_in.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(existing_questionnaire, field, value)
        db.add(existing_questionnaire)
        db.commit()
        db.refresh(existing_questionnaire)
        return existing_questionnaire
    else:
        # Create
        new_questionnaire = Questionnaire(
            user_id=current_user.id,
            **questionnaire_in.dict()
        )
        db.add(new_questionnaire)
        db.commit()
        db.refresh(new_questionnaire)
        return new_questionnaire

@router.get("/questionnaire", response_model=QuestionnaireSchema)
def get_questionnaire(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current user's tax questionnaire data.
    """
    q = db.query(Questionnaire).filter(Questionnaire.user_id == current_user.id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Questionnaire not found")
    return q
