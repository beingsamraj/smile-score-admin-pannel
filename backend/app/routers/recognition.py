from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.routers.deps import get_current_admin
from app.models.admin_user import AdminUser
from app.models.system_models import EmotionLog
from app.schemas.admin import RecognitionLogResponse

router = APIRouter(prefix="/recognition", tags=["Emotion Monitoring & Recognition"])


@router.get("/logs", response_model=List[RecognitionLogResponse])
def get_recognition_logs(
    limit: int = Query(50, ge=1, le=500),
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Fetch recent face and smile recognition activity logs."""
    logs = (
        db.query(EmotionLog)
        .order_by(EmotionLog.timestamp.desc())
        .limit(limit)
        .all()
    )
    return logs
