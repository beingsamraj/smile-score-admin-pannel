from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.admin_user import AdminUser
from app.models.system_models import AuditLog
from app.core.security import verify_password, hash_password, create_access_token
from app.schemas.admin import AdminCreateRequest, AdminUpdateRequest
from app.core.logging import logger


class AuthService:
    @staticmethod
    def authenticate_admin(db: Session, identifier: str, password: str, client_ip: Optional[str] = None) -> Optional[AdminUser]:
        """Authenticate admin via email or username and verify password."""
        identifier_clean = identifier.strip().lower()
        
        # Search by username or email (case-insensitive)
        admin = db.query(AdminUser).filter(
            or_(
                AdminUser.username.ilike(identifier_clean),
                AdminUser.email.ilike(identifier_clean),
            )
        ).first()

        if not admin:
            logger.warning(f"Failed login attempt: user '{identifier}' not found.")
            return None

        if not admin.is_active:
            logger.warning(f"Failed login attempt: account '{admin.username}' is disabled.")
            return None

        if not verify_password(password, admin.hashed_password):
            logger.warning(f"Failed login attempt: invalid password for user '{admin.username}'.")
            return None

        # Update last login timestamp
        admin.last_login_at = datetime.now(timezone.utc)
        db.add(admin)

        # Record audit log
        audit = AuditLog(
            admin_id=admin.id,
            action="ADMIN_LOGIN_SUCCESS",
            ip_address=client_ip,
            details=f"Admin {admin.username} ({admin.email}) successfully logged in.",
        )
        db.add(audit)
        db.commit()
        db.refresh(admin)

        logger.info(f"Admin logged in successfully: {admin.username} ({admin.role})")
        return admin

    @staticmethod
    def create_admin_user(db: Session, request: AdminCreateRequest, creator_id: Optional[str] = None) -> AdminUser:
        """Create a new admin user (Protected operation)."""
        existing = db.query(AdminUser).filter(
            or_(
                AdminUser.username.ilike(request.username.strip()),
                AdminUser.email.ilike(request.email.strip()),
            )
        ).first()
        if existing:
            raise ValueError("Admin with this username or email already exists.")

        admin = AdminUser(
            username=request.username.strip().lower(),
            email=request.email.strip().lower(),
            full_name=request.full_name.strip(),
            hashed_password=hash_password(request.password),
            role=request.role,
            is_active=True,
        )
        db.add(admin)
        
        audit = AuditLog(
            admin_id=creator_id,
            action="ADMIN_USER_CREATED",
            details=f"Created admin account {admin.username} with role {admin.role}.",
        )
        db.add(audit)
        db.commit()
        db.refresh(admin)
        return admin

    @staticmethod
    def update_admin_user(db: Session, admin_id: str, request: AdminUpdateRequest, updater_id: Optional[str] = None) -> AdminUser:
        admin = db.query(AdminUser).filter(AdminUser.id == admin_id).first()
        if not admin:
            raise ValueError("Admin user not found.")

        if request.full_name is not None:
            admin.full_name = request.full_name.strip()
        if request.email is not None:
            admin.email = request.email.strip().lower()
        if request.is_active is not None:
            admin.is_active = request.is_active
        if request.role is not None:
            admin.role = request.role
        if request.password:
            admin.hashed_password = hash_password(request.password)

        audit = AuditLog(
            admin_id=updater_id,
            action="ADMIN_USER_UPDATED",
            details=f"Updated admin account {admin.username}.",
        )
        db.add(audit)
        db.commit()
        db.refresh(admin)
        return admin
