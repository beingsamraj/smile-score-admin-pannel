import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.database.session import Base


def get_utc_now():
    return datetime.now(timezone.utc)


class Factory(Base):
    """
    Factory entity: Parent organizational unit.
    """
    __tablename__ = "factories"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String(128), nullable=False, index=True)
    factory_code = Column(String(64), unique=True, nullable=False, index=True)
    address = Column(String(255), nullable=False)
    city = Column(String(64), nullable=False)
    state = Column(String(64), nullable=False)
    country = Column(String(64), nullable=False)
    phone = Column(String(32), nullable=False)
    email = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    departments = relationship("Department", back_populates="factory", cascade="all, delete-orphan")
    hr_accounts = relationship("HRAccount", back_populates="factory", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Factory(id={self.id}, code={self.factory_code}, name={self.name})>"


class Department(Base):
    """
    Department entity: Belongs to a specific factory.
    """
    __tablename__ = "departments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    factory_id = Column(String(36), ForeignKey("factories.id", ondelete="RESTRICT"), nullable=False, index=True)
    name = Column(String(128), nullable=False, index=True)
    department_code = Column(String(64), nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("factory_id", "department_code", name="uq_factory_department_code"),
        UniqueConstraint("factory_id", "name", name="uq_factory_department_name"),
    )

    # Relationships
    factory = relationship("Factory", back_populates="departments")
    hr_accounts = relationship("HRAccount", back_populates="department", cascade="all, delete-orphan")
    designations = relationship("Designation", back_populates="department")

    def __repr__(self):
        return f"<Department(id={self.id}, code={self.department_code}, factory_id={self.factory_id})>"


class HRAccount(Base):
    """
    HR User account: Linked to both a Factory and a Department.
    Separate identity and role from Superadmin/Admin.
    """
    __tablename__ = "hr_accounts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    factory_id = Column(String(36), ForeignKey("factories.id", ondelete="RESTRICT"), nullable=False, index=True)
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False, index=True)
    full_name = Column(String(128), nullable=False, index=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(128), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    phone = Column(String(32), nullable=False)
    role = Column(String(32), default="hr", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now, nullable=False)
    last_login_at = Column(DateTime, nullable=True)

    # Relationships
    factory = relationship("Factory", back_populates="hr_accounts")
    department = relationship("Department", back_populates="hr_accounts")

    def __repr__(self):
        return f"<HRAccount(id={self.id}, username={self.username}, factory_id={self.factory_id})>"


class Designation(Base):
    __tablename__ = "designations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(128), unique=True, nullable=False, index=True)
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)

    department = relationship("Department", back_populates="designations")


class Employee(Base):
    """Employee record for face/fingerprint enrollment and smile recognition."""
    __tablename__ = "employees"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    employee_id = Column(String(64), unique=True, nullable=False, index=True)
    full_name = Column(String(128), nullable=False, index=True)
    department = Column(String(128), nullable=False)
    designation = Column(String(128), nullable=False)
    factory_id = Column(String(36), ForeignKey("factories.id"), nullable=True)
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True)
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
    embedding = Column(Text, nullable=True)
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
    smile_score = Column(Float, nullable=False)
    confidence = Column(Float, nullable=False)
    status = Column(String(32), default="verified", nullable=False)
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
