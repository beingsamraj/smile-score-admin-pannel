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
    FactoryCreate,
    FactoryUpdate,
    FactoryResponse,
    DepartmentResponse,
    HRResponse,
    StatusToggleRequest,
    MessageResponse,
)

router = APIRouter(prefix="/factories", tags=["Factory Management"])


def serialize_factory(f: Factory, db: Session) -> FactoryResponse:
    dept_count = db.query(Department).filter(Department.factory_id == f.id).count()
    hr_count = db.query(HRAccount).filter(HRAccount.factory_id == f.id).count()
    return FactoryResponse(
        id=f.id,
        name=f.name,
        factory_code=f.factory_code,
        address=f.address,
        city=f.city,
        state=f.state,
        country=f.country,
        phone=f.phone,
        email=f.email,
        description=f.description,
        is_active=f.is_active,
        created_at=f.created_at,
        updated_at=f.updated_at,
        departments_count=dept_count,
        hr_accounts_count=hr_count,
    )


@router.post("", response_model=FactoryResponse, status_code=status.HTTP_201_CREATED)
def create_factory(
    req: FactoryCreate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    1. Add a new factory.
    Validates unique factory_code.
    """
    existing_code = db.query(Factory).filter(Factory.factory_code.ilike(req.factory_code.strip())).first()
    if existing_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Factory with code '{req.factory_code.strip().upper()}' already exists.",
        )

    factory = Factory(
        name=req.name.strip(),
        factory_code=req.factory_code.strip().upper(),
        address=req.address.strip(),
        city=req.city.strip(),
        state=req.state.strip(),
        country=req.country.strip(),
        phone=req.phone.strip(),
        email=req.email.strip().lower(),
        description=req.description.strip() if req.description else None,
        is_active=req.is_active,
    )
    db.add(factory)

    audit = AuditLog(
        admin_id=current_admin.id,
        action="CREATE_FACTORY",
        details=f"Created factory '{factory.name}' ({factory.factory_code})",
    )
    db.add(audit)
    db.commit()
    db.refresh(factory)

    return serialize_factory(factory, db)


@router.get("", response_model=List[FactoryResponse])
def list_factories(
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status", pattern="^(all|active|inactive)$"),
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    2. View all factories with search & status filter.
    """
    query = db.query(Factory)

    if status_filter == "active":
        query = query.filter(Factory.is_active == True)
    elif status_filter == "inactive":
        query = query.filter(Factory.is_active == False)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Factory.name.ilike(s),
                Factory.factory_code.ilike(s),
                Factory.city.ilike(s),
                Factory.state.ilike(s),
                Factory.country.ilike(s),
                Factory.email.ilike(s),
                Factory.phone.ilike(s),
            )
        )

    factories = query.order_by(Factory.created_at.desc()).all()
    return [serialize_factory(f, db) for f in factories]


@router.get("/{id}", response_model=FactoryResponse)
def get_factory(
    id: str,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    3. View individual factory details.
    """
    factory = db.query(Factory).filter(Factory.id == id).first()
    if not factory:
        raise HTTPException(status_code=404, detail="Factory not found")
    return serialize_factory(factory, db)


@router.put("/{id}", response_model=FactoryResponse)
def update_factory(
    id: str,
    req: FactoryUpdate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    4. Edit factory information.
    """
    factory = db.query(Factory).filter(Factory.id == id).first()
    if not factory:
        raise HTTPException(status_code=404, detail="Factory not found")

    if req.factory_code:
        new_code = req.factory_code.strip().upper()
        if new_code != factory.factory_code:
            existing = db.query(Factory).filter(Factory.factory_code.ilike(new_code)).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Factory code '{new_code}' is already used by another factory.",
                )
            factory.factory_code = new_code

    if req.name is not None:
        factory.name = req.name.strip()
    if req.address is not None:
        factory.address = req.address.strip()
    if req.city is not None:
        factory.city = req.city.strip()
    if req.state is not None:
        factory.state = req.state.strip()
    if req.country is not None:
        factory.country = req.country.strip()
    if req.phone is not None:
        factory.phone = req.phone.strip()
    if req.email is not None:
        factory.email = req.email.strip().lower()
    if req.description is not None:
        factory.description = req.description.strip() if req.description else None
    if req.is_active is not None:
        factory.is_active = req.is_active

    factory.updated_at = datetime.now(timezone.utc)

    audit = AuditLog(
        admin_id=current_admin.id,
        action="UPDATE_FACTORY",
        details=f"Updated factory '{factory.name}' ({factory.factory_code})",
    )
    db.add(audit)
    db.commit()
    db.refresh(factory)

    return serialize_factory(factory, db)


@router.patch("/{id}/status", response_model=FactoryResponse)
def toggle_factory_status(
    id: str,
    req: StatusToggleRequest,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    5. Activate / Deactivate factory.
    """
    factory = db.query(Factory).filter(Factory.id == id).first()
    if not factory:
        raise HTTPException(status_code=404, detail="Factory not found")

    factory.is_active = req.is_active
    factory.updated_at = datetime.now(timezone.utc)

    audit = AuditLog(
        admin_id=current_admin.id,
        action="STATUS_TOGGLE_FACTORY",
        details=f"Set factory '{factory.name}' active status to {factory.is_active}",
    )
    db.add(audit)
    db.commit()
    db.refresh(factory)

    return serialize_factory(factory, db)


@router.delete("/{id}", response_model=MessageResponse)
def delete_factory(
    id: str,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Safe deletion: Prevent deletion if departments or HR accounts exist.
    """
    factory = db.query(Factory).filter(Factory.id == id).first()
    if not factory:
        raise HTTPException(status_code=404, detail="Factory not found")

    dept_count = db.query(Department).filter(Department.factory_id == factory.id).count()
    if dept_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete factory '{factory.name}' because it has {dept_count} associated department(s). Deactivate it or remove the departments first.",
        )

    hr_count = db.query(HRAccount).filter(HRAccount.factory_id == factory.id).count()
    if hr_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete factory '{factory.name}' because it has {hr_count} associated HR account(s).",
        )

    db.delete(factory)
    audit = AuditLog(
        admin_id=current_admin.id,
        action="DELETE_FACTORY",
        details=f"Deleted factory '{factory.name}' ({factory.factory_code})",
    )
    db.add(audit)
    db.commit()

    return MessageResponse(success=True, message=f"Factory '{factory.name}' deleted successfully.")


@router.get("/{id}/departments", response_model=List[DepartmentResponse])
def get_factory_departments(
    id: str,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    8. View departments belonging to a factory.
    """
    factory = db.query(Factory).filter(Factory.id == id).first()
    if not factory:
        raise HTTPException(status_code=404, detail="Factory not found")

    departments = (
        db.query(Department)
        .filter(Department.factory_id == factory.id)
        .order_by(Department.name.asc())
        .all()
    )

    result = []
    for d in departments:
        hr_c = db.query(HRAccount).filter(HRAccount.department_id == d.id).count()
        result.append(
            DepartmentResponse(
                id=d.id,
                factory_id=d.factory_id,
                factory_name=factory.name,
                factory_code=factory.factory_code,
                name=d.name,
                department_code=d.department_code,
                description=d.description,
                is_active=d.is_active,
                created_at=d.created_at,
                updated_at=d.updated_at,
                hr_accounts_count=hr_c,
            )
        )
    return result


@router.get("/{id}/hr", response_model=List[HRResponse])
def get_factory_hr_accounts(
    id: str,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    9. View HR accounts belonging to a factory.
    """
    factory = db.query(Factory).filter(Factory.id == id).first()
    if not factory:
        raise HTTPException(status_code=404, detail="Factory not found")

    hrs = (
        db.query(HRAccount)
        .filter(HRAccount.factory_id == factory.id)
        .order_by(HRAccount.full_name.asc())
        .all()
    )

    result = []
    for h in hrs:
        dept = db.query(Department).filter(Department.id == h.department_id).first()
        result.append(
            HRResponse(
                id=h.id,
                factory_id=h.factory_id,
                factory_name=factory.name,
                factory_code=factory.factory_code,
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
        )
    return result
