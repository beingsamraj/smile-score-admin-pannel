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
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
    StatusToggleRequest,
    MessageResponse,
)

router = APIRouter(prefix="/departments", tags=["Department Management"])


def serialize_department(d: Department, db: Session) -> DepartmentResponse:
    factory = db.query(Factory).filter(Factory.id == d.factory_id).first()
    hr_c = db.query(HRAccount).filter(HRAccount.department_id == d.id).count()
    return DepartmentResponse(
        id=d.id,
        factory_id=d.factory_id,
        factory_name=factory.name if factory else None,
        factory_code=factory.factory_code if factory else None,
        name=d.name,
        department_code=d.department_code,
        description=d.description,
        is_active=d.is_active,
        created_at=d.created_at,
        updated_at=d.updated_at,
        hr_accounts_count=hr_c,
    )


@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    req: DepartmentCreate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    1. Create department under a factory.
    - Must select an active factory.
    - Department name and code must be unique within the factory.
    """
    factory = db.query(Factory).filter(Factory.id == req.factory_id).first()
    if not factory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Factory with ID '{req.factory_id}' does not exist.",
        )

    if not factory.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot add departments to an inactive factory ('{factory.name}'). Please activate the factory first.",
        )

    clean_code = req.department_code.strip().upper()
    clean_name = req.name.strip()

    # Check uniqueness within factory
    existing_code = (
        db.query(Department)
        .filter(
            Department.factory_id == factory.id,
            Department.department_code.ilike(clean_code),
        )
        .first()
    )
    if existing_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Department with code '{clean_code}' already exists in factory '{factory.name}'.",
        )

    existing_name = (
        db.query(Department)
        .filter(
            Department.factory_id == factory.id,
            Department.name.ilike(clean_name),
        )
        .first()
    )
    if existing_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Department with name '{clean_name}' already exists in factory '{factory.name}'.",
        )

    dept = Department(
        factory_id=factory.id,
        name=clean_name,
        department_code=clean_code,
        description=req.description.strip() if req.description else None,
        is_active=req.is_active,
    )
    db.add(dept)

    audit = AuditLog(
        admin_id=current_admin.id,
        action="CREATE_DEPARTMENT",
        details=f"Created department '{dept.name}' ({dept.department_code}) in factory '{factory.name}'",
    )
    db.add(audit)
    db.commit()
    db.refresh(dept)

    return serialize_department(dept, db)


@router.get("", response_model=List[DepartmentResponse])
def list_departments(
    factory_id: Optional[str] = Query(None, description="Filter by Factory ID"),
    status_filter: Optional[str] = Query(None, alias="status", pattern="^(all|active|inactive)$"),
    search: Optional[str] = None,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    2. View all departments with factory filter, status filter, and search.
    """
    query = db.query(Department)

    if factory_id:
        query = query.filter(Department.factory_id == factory_id)

    if status_filter == "active":
        query = query.filter(Department.is_active == True)
    elif status_filter == "inactive":
        query = query.filter(Department.is_active == False)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Department.name.ilike(s),
                Department.department_code.ilike(s),
                Department.description.ilike(s),
            )
        )

    departments = query.order_by(Department.created_at.desc()).all()
    return [serialize_department(d, db) for d in departments]


@router.get("/{id}", response_model=DepartmentResponse)
def get_department(
    id: str,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    dept = db.query(Department).filter(Department.id == id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return serialize_department(dept, db)


@router.put("/{id}", response_model=DepartmentResponse)
def update_department(
    id: str,
    req: DepartmentUpdate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    dept = db.query(Department).filter(Department.id == id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    target_factory_id = req.factory_id if req.factory_id is not None else dept.factory_id

    # If factory is changed, verify target factory exists and is active
    if req.factory_id is not None and req.factory_id != dept.factory_id:
        new_fac = db.query(Factory).filter(Factory.id == req.factory_id).first()
        if not new_fac:
            raise HTTPException(status_code=404, detail="Target factory not found.")
        dept.factory_id = new_fac.id

    if req.department_code:
        clean_code = req.department_code.strip().upper()
        if clean_code != dept.department_code or req.factory_id is not None:
            existing = (
                db.query(Department)
                .filter(
                    Department.id != dept.id,
                    Department.factory_id == target_factory_id,
                    Department.department_code.ilike(clean_code),
                )
                .first()
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Department code '{clean_code}' already exists in target factory.",
                )
            dept.department_code = clean_code

    if req.name:
        clean_name = req.name.strip()
        if clean_name != dept.name or req.factory_id is not None:
            existing = (
                db.query(Department)
                .filter(
                    Department.id != dept.id,
                    Department.factory_id == target_factory_id,
                    Department.name.ilike(clean_name),
                )
                .first()
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Department name '{clean_name}' already exists in target factory.",
                )
            dept.name = clean_name

    if req.description is not None:
        dept.description = req.description.strip() if req.description else None
    if req.is_active is not None:
        dept.is_active = req.is_active

    dept.updated_at = datetime.now(timezone.utc)

    audit = AuditLog(
        admin_id=current_admin.id,
        action="UPDATE_DEPARTMENT",
        details=f"Updated department '{dept.name}' ({dept.department_code})",
    )
    db.add(audit)
    db.commit()
    db.refresh(dept)

    return serialize_department(dept, db)


@router.patch("/{id}/status", response_model=DepartmentResponse)
def toggle_department_status(
    id: str,
    req: StatusToggleRequest,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    dept = db.query(Department).filter(Department.id == id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    dept.is_active = req.is_active
    dept.updated_at = datetime.now(timezone.utc)

    audit = AuditLog(
        admin_id=current_admin.id,
        action="STATUS_TOGGLE_DEPARTMENT",
        details=f"Set department '{dept.name}' active status to {dept.is_active}",
    )
    db.add(audit)
    db.commit()
    db.refresh(dept)

    return serialize_department(dept, db)


@router.delete("/{id}", response_model=MessageResponse)
def delete_department(
    id: str,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Safe delete: Prevent deletion if HR accounts are associated with this department.
    """
    dept = db.query(Department).filter(Department.id == id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    hr_count = db.query(HRAccount).filter(HRAccount.department_id == dept.id).count()
    if hr_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete department '{dept.name}' because it has {hr_count} assigned HR account(s). Please reassign or delete them first.",
        )

    db.delete(dept)
    audit = AuditLog(
        admin_id=current_admin.id,
        action="DELETE_DEPARTMENT",
        details=f"Deleted department '{dept.name}' ({dept.department_code})",
    )
    db.add(audit)
    db.commit()

    return MessageResponse(success=True, message=f"Department '{dept.name}' deleted successfully.")
