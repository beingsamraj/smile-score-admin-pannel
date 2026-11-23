import os
import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database.session import get_db
from app.routers.deps import get_current_admin
from app.models.admin_user import AdminUser
from app.models.system_models import (
    Employee,
    Factory,
    Department,
    HRAccount,
    FaceTemplate,
    AuditLog,
)
from app.schemas.admin import (
    FaceSummaryResponse,
    FaceEmployeeItemResponse,
    FaceTemplateResponse,
    FaceEnrollmentBatchRequest,
    FaceVerifyRequest,
    FaceVerifyResponse,
    FaceIdentifyRequest,
    FaceIdentifyResponse,
    MessageResponse,
)
from app.services.face_engine import (
    decode_base64_image,
    detect_and_crop_face,
    extract_face_embedding,
    compress_embedding,
    decompress_embedding,
    compute_cosine_similarity,
    save_compressed_thumbnail,
)

router = APIRouter(prefix="/faces", tags=["Face Management"])

UPLOADS_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "faces")
)


def get_employee_thumbnail_url(employee_id: str, sample_id: str) -> str:
    """Generate API URL for viewing a thumbnail."""
    return f"/api/v1/faces/thumbnails/{sample_id}"


@router.get("/summary", response_model=FaceSummaryResponse)
def get_face_summary(
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return KPI summary for Face Biometrics Hub."""
    total_emps = db.query(Employee).filter(Employee.is_deleted == False).count()
    enrolled_emps = db.query(Employee).filter(
        Employee.is_deleted == False,
        Employee.is_enrolled == True,
    ).count()
    pending_emps = max(0, total_emps - enrolled_emps)
    total_templates = db.query(FaceTemplate).count()

    return FaceSummaryResponse(
        total_employees=total_emps,
        enrolled_employees=enrolled_emps,
        pending_employees=pending_emps,
        total_face_templates=total_templates,
    )


@router.get("", response_model=List[FaceEmployeeItemResponse])
def get_face_roster(
    factory_id: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    status: Optional[str] = Query("all"),  # all, enrolled, pending
    search: Optional[str] = Query(None),
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List employees with their face enrollment status, sample counts, and thumbnails."""
    query = db.query(Employee).filter(Employee.is_deleted == False)

    if factory_id:
        query = query.filter(Employee.factory_id == factory_id)
    if department_id:
        query = query.filter(Employee.department_id == department_id)
    if status == "enrolled":
        query = query.filter(Employee.is_enrolled == True)
    elif status == "pending":
        query = query.filter(Employee.is_enrolled == False)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Employee.full_name.ilike(search_term),
                Employee.employee_id.ilike(search_term),
            )
        )

    employees = query.order_by(Employee.created_at.desc()).all()
    results = []

    for emp in employees:
        templates = (
            db.query(FaceTemplate)
            .filter(FaceTemplate.employee_id == emp.id)
            .order_by(FaceTemplate.sample_index.asc())
            .all()
        )
        sample_cnt = len(templates)
        primary_thumb = (
            get_employee_thumbnail_url(emp.id, templates[0].id)
            if sample_cnt > 0
            else None
        )

        fac = (
            db.query(Factory).filter(Factory.id == emp.factory_id).first()
            if emp.factory_id
            else None
        )
        dept = (
            db.query(Department).filter(Department.id == emp.department_id).first()
            if emp.department_id
            else None
        )
        hr = (
            db.query(HRAccount).filter(HRAccount.id == emp.assigned_hr_id).first()
            if emp.assigned_hr_id
            else None
        )

        results.append(
            FaceEmployeeItemResponse(
                id=emp.id,
                employee_id=emp.employee_id,
                full_name=emp.full_name,
                factory_name=fac.name if fac else None,
                department_name=dept.name if dept else None,
                assigned_hr_name=hr.full_name if hr else None,
                is_active=emp.is_active,
                has_face_enrolled=sample_cnt > 0,
                samples_count=sample_cnt,
                primary_thumbnail_url=primary_thumb,
                enrolled_at=emp.enrolled_at,
            )
        )

    return results


@router.get("/{employee_id}/templates", response_model=List[FaceTemplateResponse])
def get_employee_face_templates(
    employee_id: str,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Retrieve all enrolled 5-angle face sample thumbnails and metadata for an employee."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")

    templates = (
        db.query(FaceTemplate)
        .filter(FaceTemplate.employee_id == emp.id)
        .order_by(FaceTemplate.sample_index.asc())
        .all()
    )

    return [
        FaceTemplateResponse(
            id=t.id,
            employee_id=t.employee_id,
            sample_index=t.sample_index,
            angle=t.angle,
            thumbnail_url=get_employee_thumbnail_url(emp.id, t.id),
            quality_score=t.quality_score,
            created_at=t.created_at,
        )
        for t in templates
    ]


@router.post("/enroll/{employee_id}", response_model=MessageResponse)
def enroll_employee_face(
    employee_id: str,
    req: FaceEnrollmentBatchRequest,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Enroll an employee with 5 multi-angle samples (center, left, right, top, bottom).
    Processes images with OpenCV, extracts 128-d compressed embeddings,
    and stores WebP thumbnails in the uploads folder.
    """
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")

    if not req.samples or len(req.samples) == 0:
        raise HTTPException(status_code=400, detail="At least 1 face sample required for enrollment.")

    emp_upload_dir = os.path.join(UPLOADS_ROOT, emp.id)
    os.makedirs(emp_upload_dir, exist_ok=True)

    # Clean existing templates to avoid orphaned vectors
    existing_templates = db.query(FaceTemplate).filter(FaceTemplate.employee_id == emp.id).all()
    for old_t in existing_templates:
        try:
            if os.path.exists(old_t.file_path):
                os.remove(old_t.file_path)
        except Exception:
            pass
        db.delete(old_t)

    saved_count = 0
    for sample in req.samples:
        img = decode_base64_image(sample.image_base64)
        if img is None:
            continue

        ok, cropped, quality, _ = detect_and_crop_face(img, target_size=(128, 128))
        if not ok or cropped is None:
            continue

        # Extract normalized 128-d biometric descriptor
        vector = extract_face_embedding(cropped)
        compressed_vector = compress_embedding(vector)

        # Save lightweight WebP thumbnail (~8 KB)
        sample_uuid = str(uuid.uuid4())
        thumb_filename = f"sample_{sample.sample_index}_{sample.angle}_{sample_uuid[:8]}.webp"
        thumb_path, _ = save_compressed_thumbnail(cropped, emp_upload_dir, thumb_filename)

        template = FaceTemplate(
            id=sample_uuid,
            employee_id=emp.id,
            sample_index=sample.sample_index,
            angle=sample.angle,
            file_path=thumb_path,
            embedding=compressed_vector,
            quality_score=quality,
        )
        db.add(template)
        saved_count += 1

    if saved_count == 0:
        raise HTTPException(
            status_code=400,
            detail="Failed to detect clear facial landmarks in the submitted samples. Please retake under good lighting.",
        )

    # Update employee enrollment status
    emp.has_face_enrolled = True
    emp.is_enrolled = True
    emp.face_id = f"FACE-{emp.employee_id}"
    emp.enrolled_at = datetime.now(timezone.utc)
    emp.updated_at = datetime.now(timezone.utc)

    # Audit log
    audit = AuditLog(
        admin_id=current_admin.id,
        action="ENROLL_FACE",
        details=f"Enrolled {saved_count} face samples for employee '{emp.full_name}' (ID: {emp.employee_id}).",
    )
    db.add(audit)
    db.commit()

    return MessageResponse(
        success=True,
        message=f"Successfully enrolled {saved_count} facial biometric samples for {emp.full_name}!",
    )


@router.delete("/{employee_id}", response_model=MessageResponse)
def delete_employee_face_biometrics(
    employee_id: str,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Remove face biometric enrollment and disk files for an employee."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")

    templates = db.query(FaceTemplate).filter(FaceTemplate.employee_id == emp.id).all()
    count = len(templates)
    for t in templates:
        try:
            if os.path.exists(t.file_path):
                os.remove(t.file_path)
        except Exception:
            pass
        db.delete(t)

    emp.has_face_enrolled = False
    emp.face_id = None
    if not emp.has_fingerprint_enrolled:
        emp.is_enrolled = False
        emp.enrolled_at = None

    audit = AuditLog(
        admin_id=current_admin.id,
        action="DELETE_FACE",
        details=f"Cleared {count} face biometric templates for '{emp.full_name}' (ID: {emp.employee_id}).",
    )
    db.add(audit)
    db.commit()

    return MessageResponse(
        success=True,
        message=f"Removed {count} face biometric samples for {emp.full_name}.",
    )


@router.post("/verify", response_model=FaceVerifyResponse)
def verify_face_1_to_1(
    req: FaceVerifyRequest,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    1:1 Verification: Compares a probe image against an employee's enrolled 5-angle vectors.
    Returns match boolean and highest confidence percentage.
    """
    emp = (
        db.query(Employee)
        .filter(or_(Employee.id == req.employee_id, Employee.employee_id == req.employee_id))
        .first()
    )
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")

    templates = db.query(FaceTemplate).filter(FaceTemplate.employee_id == emp.id).all()
    if not templates:
        return FaceVerifyResponse(
            is_match=False,
            confidence_score=0.0,
            confidence_percentage=0.0,
            matched_angle=None,
            message="No face biometric template enrolled for this employee.",
        )

    probe_img = decode_base64_image(req.image_base64)
    if probe_img is None:
        raise HTTPException(status_code=400, detail="Invalid probe image data.")

    ok, cropped, _, _ = detect_and_crop_face(probe_img, target_size=(128, 128))
    if not ok or cropped is None:
        raise HTTPException(status_code=400, detail="No face detected in the probe camera frame.")

    probe_vec = extract_face_embedding(cropped)

    best_score = 0.0
    best_angle = None

    for t in templates:
        if not t.embedding:
            continue
        try:
            enrolled_vec = decompress_embedding(t.embedding)
            score = compute_cosine_similarity(probe_vec, enrolled_vec)
            if score > best_score:
                best_score = score
                best_angle = t.angle
        except Exception:
            continue

    threshold = 0.65
    is_match = best_score >= threshold
    pct = round(best_score * 100.0, 1)

    msg = (
        f"Verified identity: {emp.full_name} ({pct}% confidence match on {best_angle} angle)"
        if is_match
        else f"Face does not match employee records ({pct}% confidence below threshold)"
    )

    return FaceVerifyResponse(
        is_match=is_match,
        confidence_score=best_score,
        confidence_percentage=pct,
        matched_angle=best_angle,
        message=msg,
    )


@router.post("/identify", response_model=FaceIdentifyResponse)
def identify_face_1_to_n(
    req: FaceIdentifyRequest,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    1:N Identification: Takes a probe image and scans all enrolled templates in the database.
    Finds the top-matching employee with the highest similarity score.
    """
    probe_img = decode_base64_image(req.image_base64)
    if probe_img is None:
        raise HTTPException(status_code=400, detail="Invalid probe image data.")

    ok, cropped, _, _ = detect_and_crop_face(probe_img, target_size=(128, 128))
    if not ok or cropped is None:
        return FaceIdentifyResponse(
            is_identified=False,
            matched_employee=None,
            confidence_score=0.0,
            confidence_percentage=0.0,
            matched_angle=None,
            message="No face detected in probe frame. Please position face clearly.",
        )

    probe_vec = extract_face_embedding(cropped)

    all_templates = db.query(FaceTemplate).all()
    if not all_templates:
        return FaceIdentifyResponse(
            is_identified=False,
            matched_employee=None,
            confidence_score=0.0,
            confidence_percentage=0.0,
            matched_angle=None,
            message="No enrolled face templates found in the database.",
        )

    best_score = 0.0
    best_template = None

    for t in all_templates:
        if not t.embedding:
            continue
        try:
            enrolled_vec = decompress_embedding(t.embedding)
            score = compute_cosine_similarity(probe_vec, enrolled_vec)
            if score > best_score:
                best_score = score
                best_template = t
        except Exception:
            continue

    req_threshold = req.threshold or 0.65
    pct = round(best_score * 100.0, 1)

    if best_score >= req_threshold and best_template:
        emp = db.query(Employee).filter(Employee.id == best_template.employee_id).first()
        if emp and not emp.is_deleted:
            fac = db.query(Factory).filter(Factory.id == emp.factory_id).first() if emp.factory_id else None
            dept = db.query(Department).filter(Department.id == emp.department_id).first() if emp.department_id else None
            hr = db.query(HRAccount).filter(HRAccount.id == emp.assigned_hr_id).first() if emp.assigned_hr_id else None

            emp_item = FaceEmployeeItemResponse(
                id=emp.id,
                employee_id=emp.employee_id,
                full_name=emp.full_name,
                factory_name=fac.name if fac else None,
                department_name=dept.name if dept else None,
                assigned_hr_name=hr.full_name if hr else None,
                is_active=emp.is_active,
                has_face_enrolled=True,
                samples_count=5,
                primary_thumbnail_url=get_employee_thumbnail_url(emp.id, best_template.id),
                enrolled_at=emp.enrolled_at,
            )
            return FaceIdentifyResponse(
                is_identified=True,
                matched_employee=emp_item,
                confidence_score=best_score,
                confidence_percentage=pct,
                matched_angle=best_template.angle,
                message=f"Identified {emp.full_name} with {pct}% confidence on {best_template.angle} angle.",
            )

    return FaceIdentifyResponse(
        is_identified=False,
        matched_employee=None,
        confidence_score=best_score,
        confidence_percentage=pct,
        matched_angle=best_template.angle if best_template else None,
        message=f"No matching employee found (Top candidate confidence {pct}% below {int(req_threshold*100)}% threshold).",
    )


@router.get("/thumbnails/{template_id}")
def get_face_thumbnail(
    template_id: str,
    db: Session = Depends(get_db),
):
    """Serve a WebP compressed thumbnail for a face template."""
    template = db.query(FaceTemplate).filter(FaceTemplate.id == template_id).first()
    if not template or not os.path.exists(template.file_path):
        raise HTTPException(status_code=404, detail="Thumbnail not found.")

    return FileResponse(template.file_path, media_type="image/webp")
