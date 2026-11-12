from typing import List, Optional
from datetime import datetime, timezone
import math
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database.session import get_db
from app.routers.deps import get_current_admin
from app.models.admin_user import AdminUser
from app.models.system_models import (
    Factory,
    Department,
    HRAccount,
    Employee,
    EmployeeTransferHistory,
    FaceTemplate,
    FingerprintRecord,
    AuditLog,
)
from app.schemas.admin import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeStatusUpdate,
    EmployeeResponse,
    EmployeeSummaryResponse,
    EmployeePaginatedResponse,
    DepartmentTransferRequest,
    FactoryTransferRequest,
    TransferHistoryResponse,
    MessageResponse,
)

router = APIRouter(prefix="/employees", tags=["Employee Management"])


def serialize_employee(emp: Employee, db: Session) -> EmployeeResponse:
    # Resolve names
    factory = db.query(Factory).filter(Factory.id == emp.factory_id).first() if emp.factory_id else None
    dept = db.query(Department).filter(Department.id == emp.department_id).first() if emp.department_id else None
    hr = db.query(HRAccount).filter(HRAccount.id == emp.assigned_hr_id).first() if emp.assigned_hr_id else None

    # Biometrics check
    has_face = db.query(FaceTemplate).filter(FaceTemplate.employee_id == emp.id).first() is not None or bool(emp.face_id)
    has_finger = db.query(FingerprintRecord).filter(FingerprintRecord.employee_id == emp.id).first() is not None or bool(emp.fingerprint_id)

    return EmployeeResponse(
        id=emp.id,
        employee_id=emp.employee_id,
        full_name=emp.full_name,
        factory_id=emp.factory_id,
        factory_name=factory.name if factory else None,
        factory_code=factory.factory_code if factory else None,
        department_id=emp.department_id,
        department_name=dept.name if dept else None,
        department_code=dept.department_code if dept else None,
        assigned_hr_id=emp.assigned_hr_id,
        assigned_hr_name=hr.full_name if hr else None,
        assigned_hr_username=hr.username if hr else None,
        phone=emp.phone,
        email=emp.email,
        face_id=emp.face_id,
        fingerprint_id=emp.fingerprint_id,
        has_face_enrolled=has_face,
        has_fingerprint_enrolled=has_finger,
        is_active=emp.is_active,
        is_enrolled=emp.is_enrolled,
        enrolled_at=emp.enrolled_at,
        created_at=emp.created_at,
        updated_at=emp.updated_at,
    )


def validate_organizational_alignment(
    db: Session,
    factory_id: str,
    department_id: str,
    assigned_hr_id: str,
    require_active: bool = True,
):
    """
    Strict server-side validation:
    1. Factory must exist (and be active if require_active).
    2. Department must exist (and be active) and belong to factory_id.
    3. Assigned HR must exist (and be active) and belong to both factory_id and department_id.
    """
    factory = db.query(Factory).filter(Factory.id == factory_id).first()
    if not factory:
        raise HTTPException(status_code=404, detail="Selected factory does not exist.")
    if require_active and not factory.is_active:
        raise HTTPException(status_code=400, detail=f"Factory '{factory.name}' is inactive. Cannot assign employees to an inactive factory.")

    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Selected department does not exist.")
    if department.factory_id != factory.id:
        raise HTTPException(
            status_code=400,
            detail=f"Department '{department.name}' does not belong to factory '{factory.name}'.",
        )
    if require_active and not department.is_active:
        raise HTTPException(status_code=400, detail=f"Department '{department.name}' is inactive.")

    hr = db.query(HRAccount).filter(HRAccount.id == assigned_hr_id).first()
    if not hr:
        raise HTTPException(status_code=404, detail="Selected HR officer does not exist.")
    if hr.factory_id != factory.id or hr.department_id != department.id:
        raise HTTPException(
            status_code=400,
            detail=f"HR officer '{hr.full_name}' is not assigned to Factory '{factory.name}' and Department '{department.name}'.",
        )
    if require_active and not hr.is_active:
        raise HTTPException(status_code=400, detail=f"HR account '{hr.username}' is inactive.")

    return factory, department, hr


@router.get("/summary", response_model=EmployeeSummaryResponse)
def get_employee_summary(
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Return statistics for Dashboard and Employee Management header cards.
    """
    total = db.query(Employee).filter(Employee.is_deleted == False).count()
    active = db.query(Employee).filter(Employee.is_deleted == False, Employee.is_active == True).count()
    inactive = db.query(Employee).filter(Employee.is_deleted == False, Employee.is_active == False).count()
    total_factories = db.query(Factory).filter(Factory.is_active == True).count()
    total_depts = db.query(Department).filter(Department.is_active == True).count()

    return EmployeeSummaryResponse(
        total_employees=total,
        active_employees=active,
        inactive_employees=inactive,
        total_factories=total_factories,
        total_departments=total_depts,
    )


@router.post("", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(
    req: EmployeeCreate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Create a new employee with numeric ID validation (up to 16 digits, preserves leading zeros),
    verifying Factory -> Department -> HR hierarchy relationships.
    """
    # 1. Check duplicate employee_id
    existing = db.query(Employee).filter(
        Employee.employee_id == req.employee_id
    ).first()
    if existing:
        if existing.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee ID '{req.employee_id}' belonged to an archived employee. Please use another ID or reactivate.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Employee ID '{req.employee_id}' is already assigned to {existing.full_name}.",
        )

    # 2. Strict hierarchical validation
    factory, dept, hr = validate_organizational_alignment(
        db,
        factory_id=req.factory_id,
        department_id=req.department_id,
        assigned_hr_id=req.assigned_hr_id,
        require_active=True,
    )

    # 3. Create employee record
    emp = Employee(
        employee_id=req.employee_id,
        full_name=req.full_name.strip(),
        factory_id=factory.id,
        department_id=dept.id,
        assigned_hr_id=hr.id,
        department=dept.name,
        designation="Staff",
        phone=req.phone.strip() if req.phone else None,
        email=req.email.strip().lower() if req.email else None,
        face_id=req.face_id.strip() if req.face_id else None,
        fingerprint_id=req.fingerprint_id.strip() if req.fingerprint_id else None,
        is_active=req.is_active,
        is_enrolled=bool(req.face_id or req.fingerprint_id),
    )
    db.add(emp)

    audit = AuditLog(
        admin_id=current_admin.id,
        action="CREATE_EMPLOYEE",
        details=f"Created employee '{emp.full_name}' (ID: {emp.employee_id}) in Factory '{factory.name}', Dept '{dept.name}', HR '{hr.full_name}'.",
    )
    db.add(audit)
    db.commit()
    db.refresh(emp)

    return serialize_employee(emp, db)


@router.get("", response_model=EmployeePaginatedResponse)
def list_employees(
    search: Optional[str] = Query(None, description="Search by Employee ID or Name"),
    factory_id: Optional[str] = Query(None, description="Filter by Factory"),
    department_id: Optional[str] = Query(None, description="Filter by Department"),
    hr_id: Optional[str] = Query(None, description="Filter by Assigned HR"),
    status_filter: Optional[str] = Query(None, alias="status", pattern="^(all|active|inactive)$"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    List non-deleted employees with multi-field search, hierarchical filters, and pagination.
    """
    query = db.query(Employee).filter(Employee.is_deleted == False)

    if factory_id:
        query = query.filter(Employee.factory_id == factory_id)

    if department_id:
        query = query.filter(Employee.department_id == department_id)

    if hr_id:
        query = query.filter(Employee.assigned_hr_id == hr_id)

    if status_filter == "active":
        query = query.filter(Employee.is_active == True)
    elif status_filter == "inactive":
        query = query.filter(Employee.is_active == False)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Employee.employee_id.ilike(s),
                Employee.full_name.ilike(s),
                Employee.phone.ilike(s),
                Employee.email.ilike(s),
            )
        )

    total_items = query.count()
    total_pages = math.ceil(total_items / size) if total_items > 0 else 1
    offset = (page - 1) * size

    employees = query.order_by(Employee.created_at.desc()).offset(offset).limit(size).all()

    items = [serialize_employee(e, db) for e in employees]

    return EmployeePaginatedResponse(
        items=items,
        total=total_items,
        page=page,
        size=size,
        total_pages=total_pages,
    )


@router.get("/{id}", response_model=EmployeeResponse)
def get_employee_details(
    id: str,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Get individual employee details by ID or numeric employee_id.
    """
    emp = db.query(Employee).filter(
        (Employee.id == id) | (Employee.employee_id == id),
        Employee.is_deleted == False,
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")
    return serialize_employee(emp, db)


@router.put("/{id}", response_model=EmployeeResponse)
def update_employee(
    id: str,
    req: EmployeeUpdate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Update employee information.
    Note: employee_id is preserved as immutable business identifier.
    Hierarchy changes trigger server-side validation.
    """
    emp = db.query(Employee).filter(
        (Employee.id == id) | (Employee.employee_id == id),
        Employee.is_deleted == False,
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")

    target_factory_id = req.factory_id if req.factory_id is not None else emp.factory_id
    target_dept_id = req.department_id if req.department_id is not None else emp.department_id
    target_hr_id = req.assigned_hr_id if req.assigned_hr_id is not None else emp.assigned_hr_id

    # If any organization field changes, validate compatibility
    if (
        (req.factory_id is not None and req.factory_id != emp.factory_id)
        or (req.department_id is not None and req.department_id != emp.department_id)
        or (req.assigned_hr_id is not None and req.assigned_hr_id != emp.assigned_hr_id)
    ):
        if not target_factory_id or not target_dept_id or not target_hr_id:
            raise HTTPException(status_code=400, detail="Factory, Department, and HR are all required.")
        validate_organizational_alignment(
            db,
            factory_id=target_factory_id,
            department_id=target_dept_id,
            assigned_hr_id=target_hr_id,
            require_active=False,
        )
        emp.factory_id = target_factory_id
        emp.department_id = target_dept_id
        emp.assigned_hr_id = target_hr_id

    if req.full_name is not None:
        emp.full_name = req.full_name.strip()
    if req.phone is not None:
        emp.phone = req.phone.strip() if req.phone else None
    if req.email is not None:
        emp.email = req.email.strip().lower() if req.email else None
    if req.face_id is not None:
        emp.face_id = req.face_id.strip() if req.face_id else None
    if req.fingerprint_id is not None:
        emp.fingerprint_id = req.fingerprint_id.strip() if req.fingerprint_id else None
    if req.is_active is not None:
        emp.is_active = req.is_active

    emp.updated_at = datetime.now(timezone.utc)

    audit = AuditLog(
        admin_id=current_admin.id,
        action="UPDATE_EMPLOYEE",
        details=f"Updated employee {emp.employee_id} ({emp.full_name})",
    )
    db.add(audit)
    db.commit()
    db.refresh(emp)

    return serialize_employee(emp, db)


@router.patch("/{id}/status", response_model=EmployeeResponse)
def toggle_employee_status(
    id: str,
    req: EmployeeStatusUpdate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter(
        (Employee.id == id) | (Employee.employee_id == id),
        Employee.is_deleted == False,
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")

    emp.is_active = req.is_active
    emp.updated_at = datetime.now(timezone.utc)

    audit = AuditLog(
        admin_id=current_admin.id,
        action="STATUS_TOGGLE_EMPLOYEE",
        details=f"Set employee {emp.employee_id} active status to {emp.is_active}",
    )
    db.add(audit)
    db.commit()
    db.refresh(emp)

    return serialize_employee(emp, db)


@router.delete("/{id}", response_model=MessageResponse)
def soft_delete_employee(
    id: str,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Soft-delete employee: marks is_deleted=True, sets deleted_at,
    retaining historical audit and biometric records without breaking relationships.
    """
    emp = db.query(Employee).filter(
        (Employee.id == id) | (Employee.employee_id == id),
        Employee.is_deleted == False,
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")

    emp.is_deleted = True
    emp.is_active = False
    emp.deleted_at = datetime.now(timezone.utc)
    emp.updated_at = datetime.now(timezone.utc)

    audit = AuditLog(
        admin_id=current_admin.id,
        action="SOFT_DELETE_EMPLOYEE",
        details=f"Soft-deleted employee '{emp.full_name}' (ID: {emp.employee_id})",
    )
    db.add(audit)
    db.commit()

    return MessageResponse(
        success=True,
        message=f"Employee '{emp.full_name}' ({emp.employee_id}) has been successfully deleted.",
    )


# -------------------------------------------------------------
# TRANSFER FUNCTIONALITY (Transactional with History & Audit)
# -------------------------------------------------------------
@router.post("/{id}/transfer/department", response_model=EmployeeResponse)
def transfer_employee_department(
    id: str,
    req: DepartmentTransferRequest,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Department Transfer:
    Move employee from one department to another department within the SAME factory.
    - Factory ID and Employee ID remain unchanged.
    - Validates target department belongs to employee's current factory.
    - Validates new assigned HR belongs to target department and current factory.
    - Records entry in EmployeeTransferHistory and AuditLog.
    """
    emp = db.query(Employee).filter(
        (Employee.id == id) | (Employee.employee_id == id),
        Employee.is_deleted == False,
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")

    if not emp.factory_id:
        raise HTTPException(status_code=400, detail="Employee has no current factory assigned.")

    # Validate target department & HR in current factory
    factory, target_dept, new_hr = validate_organizational_alignment(
        db,
        factory_id=emp.factory_id,
        department_id=req.target_department_id,
        assigned_hr_id=req.new_assigned_hr_id,
        require_active=True,
    )

    if emp.department_id == target_dept.id and emp.assigned_hr_id == new_hr.id:
        raise HTTPException(
            status_code=400,
            detail=f"Employee is already in department '{target_dept.name}' assigned to '{new_hr.full_name}'.",
        )

    # Resolve previous names
    prev_dept = db.query(Department).filter(Department.id == emp.department_id).first() if emp.department_id else None
    prev_hr = db.query(HRAccount).filter(HRAccount.id == emp.assigned_hr_id).first() if emp.assigned_hr_id else None

    # Atomic transaction
    try:
        # Record transfer history
        history = EmployeeTransferHistory(
            employee_id=emp.id,
            transfer_type="department",
            previous_factory_id=emp.factory_id,
            previous_factory_name=factory.name,
            previous_department_id=emp.department_id,
            previous_department_name=prev_dept.name if prev_dept else None,
            previous_hr_id=emp.assigned_hr_id,
            previous_hr_name=prev_hr.full_name if prev_hr else None,
            new_factory_id=factory.id,
            new_factory_name=factory.name,
            new_department_id=target_dept.id,
            new_department_name=target_dept.name,
            new_hr_id=new_hr.id,
            new_hr_name=new_hr.full_name,
            transferred_by_admin_id=current_admin.id,
            transfer_date=datetime.now(timezone.utc),
            reason=req.reason.strip() if req.reason else None,
        )
        db.add(history)

        # Update employee
        emp.department_id = target_dept.id
        emp.department = target_dept.name
        emp.assigned_hr_id = new_hr.id
        emp.updated_at = datetime.now(timezone.utc)

        # Audit
        audit = AuditLog(
            admin_id=current_admin.id,
            action="TRANSFER_EMPLOYEE_DEPARTMENT",
            details=f"Transferred employee {emp.employee_id} ({emp.full_name}) from Dept '{prev_dept.name if prev_dept else 'None'}' to '{target_dept.name}', HR '{new_hr.full_name}'.",
        )
        db.add(audit)

        db.commit()
        db.refresh(emp)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to complete department transfer: {str(e)}")

    return serialize_employee(emp, db)


@router.post("/{id}/transfer/factory", response_model=EmployeeResponse)
def transfer_employee_factory(
    id: str,
    req: FactoryTransferRequest,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Factory Transfer:
    Move employee from current factory to another factory.
    - Validates target factory, target department, and new assigned HR all match and are active.
    - Updates Factory ID, Department ID, and Assigned HR ID together atomically.
    - Preserves Employee ID and Employee Name.
    - Records transfer history and audit log.
    """
    emp = db.query(Employee).filter(
        (Employee.id == id) | (Employee.employee_id == id),
        Employee.is_deleted == False,
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")

    if emp.factory_id == req.target_factory_id:
        raise HTTPException(
            status_code=400,
            detail="Target factory is identical to current factory. Use Department Transfer instead.",
        )

    # Validate target hierarchy
    target_fac, target_dept, new_hr = validate_organizational_alignment(
        db,
        factory_id=req.target_factory_id,
        department_id=req.target_department_id,
        assigned_hr_id=req.new_assigned_hr_id,
        require_active=True,
    )

    # Previous names
    prev_fac = db.query(Factory).filter(Factory.id == emp.factory_id).first() if emp.factory_id else None
    prev_dept = db.query(Department).filter(Department.id == emp.department_id).first() if emp.department_id else None
    prev_hr = db.query(HRAccount).filter(HRAccount.id == emp.assigned_hr_id).first() if emp.assigned_hr_id else None

    # Atomic transaction
    try:
        history = EmployeeTransferHistory(
            employee_id=emp.id,
            transfer_type="factory",
            previous_factory_id=emp.factory_id,
            previous_factory_name=prev_fac.name if prev_fac else None,
            previous_department_id=emp.department_id,
            previous_department_name=prev_dept.name if prev_dept else None,
            previous_hr_id=emp.assigned_hr_id,
            previous_hr_name=prev_hr.full_name if prev_hr else None,
            new_factory_id=target_fac.id,
            new_factory_name=target_fac.name,
            new_department_id=target_dept.id,
            new_department_name=target_dept.name,
            new_hr_id=new_hr.id,
            new_hr_name=new_hr.full_name,
            transferred_by_admin_id=current_admin.id,
            transfer_date=datetime.now(timezone.utc),
            reason=req.reason.strip() if req.reason else None,
        )
        db.add(history)

        # Update all three organizational foreign keys
        emp.factory_id = target_fac.id
        emp.department_id = target_dept.id
        emp.department = target_dept.name
        emp.assigned_hr_id = new_hr.id
        emp.updated_at = datetime.now(timezone.utc)

        audit = AuditLog(
            admin_id=current_admin.id,
            action="TRANSFER_EMPLOYEE_FACTORY",
            details=f"Transferred employee {emp.employee_id} ({emp.full_name}) from Factory '{prev_fac.name if prev_fac else 'None'}' to '{target_fac.name}', Dept '{target_dept.name}', HR '{new_hr.full_name}'.",
        )
        db.add(audit)

        db.commit()
        db.refresh(emp)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to complete factory transfer: {str(e)}")

    return serialize_employee(emp, db)


@router.get("/{id}/transfer-history", response_model=List[TransferHistoryResponse])
def get_employee_transfer_history(
    id: str,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Retrieve historical organizational transfers for an employee.
    """
    emp = db.query(Employee).filter(
        (Employee.id == id) | (Employee.employee_id == id)
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")

    records = (
        db.query(EmployeeTransferHistory)
        .filter(EmployeeTransferHistory.employee_id == emp.id)
        .order_by(EmployeeTransferHistory.transfer_date.desc())
        .all()
    )
    return records


# -------------------------------------------------------------
# BIOMETRICS & FACE ENROLLMENT (PRESERVED)
# -------------------------------------------------------------
@router.post("/{employee_id}/enroll-face")
async def enroll_face(
    employee_id: str,
    files: List[UploadFile] = File(...),
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter(
        (Employee.id == employee_id) | (Employee.employee_id == employee_id),
        Employee.is_deleted == False,
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
    emp.face_id = f"FACE-{emp.employee_id}"
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
        (Employee.id == employee_id) | (Employee.employee_id == employee_id),
        Employee.is_deleted == False,
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    db.query(FaceTemplate).filter(FaceTemplate.employee_id == emp.id).delete()
    emp.is_enrolled = False
    emp.face_id = None
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
