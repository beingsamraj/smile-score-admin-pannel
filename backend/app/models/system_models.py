import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Float, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship
from app.database.session import Base


def get_utc_now():
    return datetime.now(timezone.utc)


class Department(Base):
    __tablename__ = "departments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(128), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)


class Designation(Base):
    __tablename__ = "designations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(128), unique=True, nullable=False, index=True)
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)


class Employee(Base):
    """Employee record for face/fingerprint enrollment and smile recognition."""
    __tablename__ = "employees"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    employee_id = Column(String(64), unique=True, nullable=False, index=True)
    full_name = Column(String(128), nullable=False, index=True)
    department = Column(String(128), nullable=False)
    designation = Column(String(128), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_enrolled = Column(Boolean, default=False, nullable=False)
    enrolled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now, nullable=False)


class FaceTemplate(Base):
    """Face biometric enrollment records."""
    __tablename__ = "face_templates"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    employee_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    sample_index = Column(Integer, nullable=False, default=1)
    file_path = Column(String(512), nullable=False)
    embedding = Column(Text, nullable=True)  # JSON or serialized vector
    created_at = Column(DateTime, default=get_utc_now, nullable=False)


class FingerprintRecord(Base):
    """Fingerprint biometric enrollment and verification records."""
    __tablename__ = "fingerprint_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    employee_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    finger_index = Column(Integer, default=0, nullable=False)
    template_data = Column(Text, nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)


class EmotionLog(Base):
    """Emotion monitoring and Smile Score logs."""
    __tablename__ = "emotion_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    employee_id = Column(String(64), nullable=False, index=True)
    employee_name = Column(String(128), nullable=False)
    smile_score = Column(Float, nullable=False)  # 0 to 100
    confidence = Column(Float, nullable=False)   # 0 to 1.0
    status = Column(String(32), default="verified", nullable=False)  # verified, flagged, rejected
    timestamp = Column(DateTime, default=get_utc_now, nullable=False, index=True)
    raw_payload = Column(Text, nullable=True)


class AuditLog(Base):
    """Admin security and audit trail."""
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    admin_id = Column(String(36), nullable=True, index=True)
    action = Column(String(128), nullable=False)
    ip_address = Column(String(64), nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False, index=True)
