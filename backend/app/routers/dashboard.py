from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.routers.deps import get_current_admin
from app.models.admin_user import AdminUser
from app.models.system_models import Employee, EmotionLog

router = APIRouter(prefix="/dashboard", tags=["Smile Score Dashboard Analytics"])


@router.get("/summary", response_model=Dict[str, Any])
def get_dashboard_summary(
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Architecture placeholder endpoint for Smile Score Dashboard calculations and analytics.
    """
    total_employees = db.query(Employee).count()
    enrolled_employees = db.query(Employee).filter(Employee.is_enrolled == True).count()
    active_employees = db.query(Employee).filter(Employee.is_active == True).count()
    total_scans = db.query(EmotionLog).count()

    avg_smile = db.query(func.avg(EmotionLog.smile_score)).scalar() or 0.0

    return {
        "total_employees": total_employees,
        "enrolled_employees": enrolled_employees,
        "active_employees": active_employees,
        "total_scans": total_scans,
        "average_smile_score": round(float(avg_smile), 2),
    }
