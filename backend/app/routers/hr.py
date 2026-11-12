from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database.session import get_db
from app.routers.deps import get_current_admin
from app.models.admin_user import AdminUser
from app.models.system_models import Factory, Department, HRAccount, AuditLog
from app.schemas.admin import (
    HRCreateRequest,
    HRUpdateRequest,
    HRResetPasswordRequest,
    HRResponse,
    StatusToggleRequest,
    MessageResponse,
)
from app.core.security import hash_password

router = APIRouter(prefix="/hr", tags=["HR Management"])


def serialize_hr(h: HRAccount, db: Session) -> HRResponse:
    factory = db.query(Factory).filter(Factory.id == h.factory_id).first()
    dept = db.query(Department).filter(Department.id == h.department_id).first()
    return HRResponse(
        id=h.id,
        factory_id=h.factory_id,
        factory_name=factory.name if factory else None,
        factory_code=factory.factory_code if factory else None,
        department_id=h.department_id,
        department_name=dept.name if dept else None,
        department_code=dept.department_code if dept else None,
        full_name=h.full_name,
        username=h.username,
        email=h.email,
        phone=h.phone,
        role=h.role,
        is_active=h.is_active,
        created_at=h.created_at,
        updated_at=h.updated_at,
        last_login_at=h.last_login_at,
    )


@router.post("", response_model=HRResponse, status_code=status.HTTP_201_CREATED)
def create_hr(
    req: HRCreateRequest,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    1. Create HR account linked to both Factory and Department.
    - Validates factory exists and is active.
    - Validates department exists and belongs to that factory.
    - Validates uniqueness of username & email.
    - Hashes password securely without exposing in response or logs.
    """
    factory = db.query(Factory).filter(Factory.id == req.factory_id).first()
    if not factory:
        raise HTTPException(status_code=404, detail="Selected factory does not exist.")

    if not factory.is_active:
        raise HTTPException(
            status_code=400,
            detail=f"Factory '{factory.name}' is inactive. Cannot register HR for an inactive factory.",
        )

    dept = db.query(Department).filter(Department.id == req.department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Selected department does not exist.")

    if dept.factory_id != factory.id:
        raise HTTPException(
            status_code=400,
            detail=f"Department '{dept.name}' does not belong to factory '{factory.name}'.",
        )

    # Check username
    username_clean = req.username.strip().lower()
    if db.query(HRAccount).filter(HRAccount.username.ilike(username_clean)).first():
        raise HTTPException(
            status_code=400,
            detail=f"Username '{req.username}' is already taken.",
        )

    # Check email
    email_clean = req.email.strip().lower()
    if db.query(HRAccount).filter(HRAccount.email.ilike(email_clean)).first():
        raise HTTPException(
            status_code=400,
            detail=f"Email address '{req.email}' is already registered.",
        )

    hr = HRAccount(
        factory_id=factory.id,
        department_id=dept.id,
        full_name=req.full_name.strip(),
        username=username_clean,
        email=email_clean,
        hashed_password=hash_password(req.password),
        phone=req.phone.strip(),
        role="hr",
        is_active=req.is_active,
    )
    db.add(hr)

    audit = AuditLog(
        admin_id=current_admin.id,
        action="CREATE_HR_ACCOUNT",
        details=f"Created HR account '{hr.username}' ({hr.email}) for Factory '{factory.name}', Dept '{dept.name}'",
    )
    db.add(audit)
    db.commit()
    db.refresh(hr)

    return serialize_hr(hr, db)


@router.get("", response_model=List[HRResponse])
def list_hr_accounts(
    factory_id: Optional[str] = Query(None, description="Filter by Factory"),
    department_id: Optional[str] = Query(None, description="Filter by Department"),
    status_filter: Optional[str] = Query(None, alias="status", pattern="^(all|active|inactive)$"),
    search: Optional[str] = None,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    2. View all HR accounts with multi-level filtering and search.
    """
    query = db.query(HRAccount)

    if factory_id:
        query = query.filter(HRAccount.factory_id == factory_id)

    if department_id:
        query = query.filter(HRAccount.department_id == department_id)

    if status_filter == "active":
        query = query.filter(HRAccount.is_active == True)
    elif status_filter == "inactive":
        query = query.filter(HRAccount.is_active == False)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                HRAccount.full_name.ilike(s),
                HRAccount.username.ilike(s),
                HRAccount.email.ilike(s),
                HRAccount.phone.ilike(s),
            )
        )

    hrs = query.order_by(HRAccount.created_at.desc()).all()
    return [serialize_hr(h, db) for h in hrs]


@router.get("/{id}", response_model=HRResponse)
def get_hr_account(
    id: str,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    hr = db.query(HRAccount).filter(HRAccount.id == id).first()
    if not hr:
        raise HTTPException(status_code=404, detail="HR account not found.")
    return serialize_hr(hr, db)


@router.put("/{id}", response_model=HRResponse)
def update_hr_account(
    id: str,
    req: HRUpdateRequest,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Update HR details including reassignment of Factory and Department.
    """
    hr = db.query(HRAccount).filter(HRAccount.id == id).first()
    if not hr:
        raise HTTPException(status_code=404, detail="HR account not found.")

    target_factory_id = req.factory_id if req.factory_id is not None else hr.factory_id
    target_dept_id = req.department_id if req.department_id is not None else hr.department_id

    # If factory or department changed, validate compatibility
    if req.factory_id is not None or req.department_id is not None:
        factory = db.query(Factory).filter(Factory.id == target_factory_id).first()
        if not factory:
            raise HTTPException(status_code=404, detail="Target factory not found.")

        dept = db.query(Department).filter(Department.id == target_dept_id).first()
        if not dept:
            raise HTTPException(status_code=404, detail="Target department not found.")

        if dept.factory_id != factory.id:
            raise HTTPException(
                status_code=400,
                detail=f"Target department '{dept.name}' does not belong to factory '{factory.name}'.",
            )

        hr.factory_id = factory.id
        hr.department_id = dept.id

    if req.username:
        u_clean = req.username.strip().lower()
        if u_clean != hr.username:
            existing = db.query(HRAccount).filter(HRAccount.id != hr.id, HRAccount.username.ilike(u_clean)).first()
            if existing:
                raise HTTPException(status_code=400, detail="Username is already taken.")
            hr.username = u_clean

    if req.email:
        e_clean = req.email.strip().lower()
        if e_clean != hr.email:
            existing = db.query(HRAccount).filter(HRAccount.id != hr.id, HRAccount.email.ilike(e_clean)).first()
            if existing:
                raise HTTPException(status_code=400, detail="Email is already in use.")
            hr.email = e_clean

    if req.full_name is not None:
        hr.full_name = req.full_name.strip()
    if req.phone is not None:
        hr.phone = req.phone.strip()
    if req.is_active is not None:
        hr.is_active = req.is_active

    hr.updated_at = datetime.now(timezone.utc)

    audit = AuditLog(
        admin_id=current_admin.id,
        action="UPDATE_HR_ACCOUNT",
        details=f"Updated HR account '{hr.username}' ({hr.full_name})",
    )
    db.add(audit)
    db.commit()
    db.refresh(hr)

    return serialize_hr(hr, db)


@router.patch("/{id}/status", response_model=HRResponse)
def toggle_hr_status(
    id: str,
    req: StatusToggleRequest,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    hr = db.query(HRAccount).filter(HRAccount.id == id).first()
    if not hr:
        raise HTTPException(status_code=404, detail="HR account not found.")

    hr.is_active = req.is_active
    hr.updated_at = datetime.now(timezone.utc)

    audit = AuditLog(
        admin_id=current_admin.id,
        action="STATUS_TOGGLE_HR",
        details=f"Set HR account '{hr.username}' active status to {hr.is_active}",
    )
    db.add(audit)
    db.commit()
    db.refresh(hr)

    return serialize_hr(hr, db)


@router.patch("/{id}/reset-password", response_model=MessageResponse)
def reset_hr_password(
    id: str,
    req: HRResetPasswordRequest,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Admin action: Reset HR account password.
    """
    hr = db.query(HRAccount).filter(HRAccount.id == id).first()
    if not hr:
        raise HTTPException(status_code=404, detail="HR account not found.")

    hr.hashed_password = hash_password(req.new_password)
    hr.updated_at = datetime.now(timezone.utc)

    audit = AuditLog(
        admin_id=current_admin.id,
        action="RESET_HR_PASSWORD",
        details=f"Admin reset password for HR account '{hr.username}'",
    )
    db.add(audit)
    db.commit()

    return MessageResponse(success=True, message=f"Password for HR '{hr.username}' has been successfully reset.")


@router.delete("/{id}", response_model=MessageResponse)
def delete_hr_account(
    id: str,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    hr = db.query(HRAccount).filter(HRAccount.id == id).first()
    if not hr:
        raise HTTPException(status_code=404, detail="HR account not found.")

    username = hr.username
    db.delete(hr)

    audit = AuditLog(
        admin_id=current_admin.id,
        action="DELETE_HR_ACCOUNT",
        details=f"Deleted HR account '{username}'",
    )
    db.add(audit)
    db.commit()

    return MessageResponse(success=True, message=f"HR account '{username}' deleted successfully.")
