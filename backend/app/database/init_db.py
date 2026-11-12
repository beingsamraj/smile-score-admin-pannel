from sqlalchemy.orm import Session
from app.database.session import Base, engine, SessionLocal
from app.models.admin_user import AdminUser
from app.models.system_models import (
    Department,
    Designation,
    Employee,
    FaceTemplate,
    FingerprintRecord,
    EmotionLog,
    AuditLog,
)
from app.core.config import settings
from app.core.security import hash_password
from app.core.logging import logger


def init_db() -> None:
    """Initialize database tables and create default superadmin if table is empty."""
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        # Check if an admin user already exists
        existing_admin = db.query(AdminUser).first()
        if not existing_admin:
            logger.info("No admin user found. Creating initial Superadmin user...")
            superadmin = AdminUser(
                username=settings.FIRST_SUPERADMIN_USERNAME,
                email=settings.FIRST_SUPERADMIN_EMAIL,
                full_name=settings.FIRST_SUPERADMIN_NAME,
                hashed_password=hash_password(settings.FIRST_SUPERADMIN_PASSWORD),
                role="superadmin",
                is_active=True,
            )
            db.add(superadmin)
            
            # Initial audit entry
            audit = AuditLog(
                action="SYSTEM_INIT",
                details="Initial superadmin account automatically seeded.",
            )
            db.add(audit)
            db.commit()
            logger.info(f"Initial superadmin created: {superadmin.username} ({superadmin.email})")
        else:
            logger.info("Admin user(s) already exist. Skipping seed.")
    except Exception as e:
        logger.error(f"Error during database initialization: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
