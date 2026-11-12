from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.routers.deps import get_current_admin
from app.models.admin_user import AdminUser
from app.schemas.admin import MessageResponse

router = APIRouter(prefix="/reports", tags=["Reports & Exports"])


@router.get("/export")
def export_reports(
    report_type: str = Query("smile_scores", pattern="^(smile_scores|attendance|audit_logs)$"),
    export_format: str = Query("excel", pattern="^(excel|pdf|csv)$"),
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Architecture placeholder endpoint for future PDF and Excel exports.
    """
    return {
        "report_type": report_type,
        "format": export_format,
        "status": "ready_for_generation",
        "message": f"{report_type} report generation in {export_format} format is scheduled.",
    }
