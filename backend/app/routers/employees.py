from typing import List, Optional
from datetime import datetime, timezone
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.routers.deps import get_current_admin
from app.models.admin_user import AdminUser
from app.models.system_models import Employee, FaceTemplate, AuditLog
from app.schemas.admin import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeStatusUpdate,
    EmployeeResponse,
    MessageResponse,
)

router = APIRouter(prefix="/employees", tags=["Employee Management"])


@router.get("", response_model=List[EmployeeResponse])
def get_employees(
    search: Optional[str] = None,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Employee)
    if search:
        search_filter = f"%{search.strip()}%"
        query = query.filter(
            (Employee.full_name.ilike(search_filter))
            | (Employee.employee_id.ilike(search_filter))
            | (Employee.department.ilike(search_filter))
            | (Employee.designation.ilike(search_filter))
        )
    return query.order_by(Employee.created_at.desc()).all()


@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(
    employee_id: str,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter(
        (Employee.id == employee_id) | (Employee.employee_id == employee_id)
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp


@router.post("", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(
    req: EmployeeCreate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    existing = db.query(Employee).filter(Employee.employee_id == req.employee_id.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Employee with this ID already exists.")

    emp = Employee(
        employee_id=req.employee_id.strip(),
        full_name=req.full_name.strip(),
        department=req.department.strip(),
        designation=req.designation.strip(),
        is_active=True,
        is_enrolled=False,
    )
    db.add(emp)
    
    audit = AuditLog(
        admin_id=current_admin.id,
        action="CREATE_EMPLOYEE",
        details=f"Created employee {emp.employee_id} ({emp.full_name})",
    )
    db.add(audit)
    db.commit()
    db.refresh(emp)
    return emp


@router.patch("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: str,
    req: EmployeeUpdate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter(
        (Employee.id == employee_id) | (Employee.employee_id == employee_id)
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    if req.full_name is not None:
        emp.full_name = req.full_name.strip()
    if req.department is not None:
        emp.department = req.department.strip()
    if req.designation is not None:
        emp.designation = req.designation.strip()
    if req.is_active is not None:
        emp.is_active = req.is_active

    emp.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(emp)
    return emp


@router.patch("/{employee_id}/status", response_model=EmployeeResponse)
def toggle_employee_status(
    employee_id: str,
    req: EmployeeStatusUpdate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter(
        (Employee.id == employee_id) | (Employee.employee_id == employee_id)
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    emp.is_active = req.is_active
    emp.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(emp)
    return emp


@router.post("/{employee_id}/enroll-face")
async def enroll_face(
    employee_id: str,
    files: List[UploadFile] = File(...),
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter(
        (Employee.id == employee_id) | (Employee.employee_id == employee_id)
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    if not files:
        raise HTTPException(status_code=400, detail="No face image files uploaded.")

    upload_dir = os.path.join("data", "faces", emp.employee_id)
    os.makedirs(upload_dir, exist_ok=True)

    saved_count = 0
    for idx, file in enumerate(files):
        ext = os.path.splitext(file.filename or "")[1] or ".jpg"
        filename = f"{uuid.uuid4().hex[:8]}_{idx + 1}{ext}"
        filepath = os.path.join(upload_dir, filename)

        contents = await file.read()
        with open(filepath, "wb") as f:
            f.write(contents)

        template = FaceTemplate(
            employee_id=emp.id,
            sample_index=idx + 1,
            file_path=filepath,
        )
        db.add(template)
        saved_count += 1

    emp.is_enrolled = True
    emp.enrolled_at = datetime.now(timezone.utc)
    emp.updated_at = datetime.now(timezone.utc)

    audit = AuditLog(
        admin_id=current_admin.id,
        action="ENROLL_FACE",
        details=f"Enrolled {saved_count} face samples for employee {emp.employee_id}",
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Successfully enrolled {saved_count} face samples.",
        "samples_processed": saved_count,
        "enrolled_at": emp.enrolled_at.isoformat(),
    }


@router.delete("/{employee_id}/enroll-face", response_model=MessageResponse)
def revoke_face_enrollment(
    employee_id: str,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter(
        (Employee.id == employee_id) | (Employee.employee_id == employee_id)
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    db.query(FaceTemplate).filter(FaceTemplate.employee_id == emp.id).delete()
    emp.is_enrolled = False
    emp.enrolled_at = None
    emp.updated_at = datetime.now(timezone.utc)

    audit = AuditLog(
        admin_id=current_admin.id,
        action="REVOKE_FACE_ENROLLMENT",
        details=f"Revoked face enrollment for employee {emp.employee_id}",
    )
    db.add(audit)
    db.commit()

    return MessageResponse(success=True, message="Face enrollment revoked successfully.")
