import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Enum
from app.database.session import Base


def get_utc_now():
    return datetime.now(timezone.utc)


class AdminUser(Base):
    """Admin user model for authentication, authorization and role management."""
    __tablename__ = "admin_users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(128), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(32), default="admin", nullable=False)  # "superadmin" or "admin"
    is_active = Column(Boolean, default=True, nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now, nullable=False)

    def __repr__(self):
        return f"<AdminUser(id={self.id}, username={self.username}, role={self.role})>"
