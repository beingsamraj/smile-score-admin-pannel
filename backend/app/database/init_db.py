from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database.session import Base, engine, SessionLocal
from app.models.admin_user import AdminUser
from app.models.system_models import (
    Factory,
    Department,
    HRAccount,
    Designation,
    Employee,
    EmployeeTransferHistory,
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
        # Check and migrate columns on SQLite if missing
        try:
            cols = [row[1] for row in db.execute(text("PRAGMA table_info(employees)")).fetchall()]
            migrations = [
                ("factory_id", "VARCHAR(36) REFERENCES factories(id)"),
                ("department_id", "VARCHAR(36) REFERENCES departments(id)"),
                ("assigned_hr_id", "VARCHAR(36) REFERENCES hr_accounts(id)"),
                ("phone", "VARCHAR(32)"),
                ("email", "VARCHAR(128)"),
                ("face_id", "VARCHAR(64)"),
                ("fingerprint_id", "VARCHAR(64)"),
                ("is_deleted", "BOOLEAN DEFAULT 0"),
                ("deleted_at", "DATETIME"),
            ]
            for col_name, col_type in migrations:
                if col_name not in cols:
                    db.execute(text(f"ALTER TABLE employees ADD COLUMN {col_name} {col_type}"))
                    logger.info(f"Migrated employees table: added {col_name} column.")
            db.commit()
        except Exception as mig_err:
            logger.warning(f"Column migration check note: {mig_err}")

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
