from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.admin import (
    AdminLoginRequest,
    TokenResponse,
    AdminUserResponse,
    AdminCreateRequest,
    AdminUpdateRequest,
    MessageResponse,
)
from app.services.auth_service import AuthService
from app.core.security import create_access_token
from app.routers.deps import get_current_admin, require_superadmin
from app.models.admin_user import AdminUser
from app.models.system_models import AuditLog

router = APIRouter(prefix="/auth", tags=["Admin Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(login_data: AdminLoginRequest, request: Request, db: Session = Depends(get_db)):
    """
    Authenticate an administrator with username/email and password.
    Returns standard JWT access token and user metadata.
    """
    client_ip = request.client.host if request.client else None
    admin = AuthService.authenticate_admin(
        db=db,
        identifier=login_data.username,
        password=login_data.password,
        client_ip=client_ip,
    )

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your username/email and password.",
        )

    # Generate token
    token = create_access_token(
        subject=admin.id,
        claims={"role": admin.role, "email": admin.email, "username": admin.username},
    )

    admin_response = AdminUserResponse(
        id=admin.id,
        username=admin.username,
        email=admin.email,
        name=admin.full_name,
        role=admin.role,
        is_active=admin.is_active,
        last_login_at=admin.last_login_at,
        created_at=admin.created_at,
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=admin_response,
    )


@router.get("/me", response_model=AdminUserResponse)
def get_current_user_profile(current_admin: AdminUser = Depends(get_current_admin)):
    """Return profile info of the currently logged-in administrator."""
    return AdminUserResponse(
        id=current_admin.id,
        username=current_admin.username,
        email=current_admin.email,
        name=current_admin.full_name,
        role=current_admin.role,
        is_active=current_admin.is_active,
        last_login_at=current_admin.last_login_at,
        created_at=current_admin.created_at,
    )


@router.post("/logout", response_model=MessageResponse)
def logout(request: Request, current_admin: AdminUser = Depends(get_current_admin), db: Session = Depends(get_db)):
    """
    Log out the current admin session and record the audit event.
    """
    client_ip = request.client.host if request.client else None
    audit = AuditLog(
        admin_id=current_admin.id,
        action="ADMIN_LOGOUT",
        ip_address=client_ip,
        details=f"Admin {current_admin.username} logged out.",
    )
    db.add(audit)
    db.commit()
    return MessageResponse(success=True, message="Successfully logged out.")


# Protected Admin Management Endpoints (Superadmin only)
@router.post("/users", response_model=AdminUserResponse)
def create_admin(
    req: AdminCreateRequest,
    current_admin: AdminUser = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Create a new admin user (Restricted to Superadmin)."""
    try:
        new_admin = AuthService.create_admin_user(db=db, request=req, creator_id=current_admin.id)
        return AdminUserResponse(
            id=new_admin.id,
            username=new_admin.username,
            email=new_admin.email,
            name=new_admin.full_name,
            role=new_admin.role,
            is_active=new_admin.is_active,
            last_login_at=new_admin.last_login_at,
            created_at=new_admin.created_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/users", response_model=list[AdminUserResponse])
def list_admins(
    current_admin: AdminUser = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """List all registered administrators (Restricted to Superadmin)."""
    admins = db.query(AdminUser).order_by(AdminUser.created_at.desc()).all()
    return [
        AdminUserResponse(
            id=a.id,
            username=a.username,
            email=a.email,
            name=a.full_name,
            role=a.role,
            is_active=a.is_active,
            last_login_at=a.last_login_at,
            created_at=a.created_at,
        )
        for a in admins
    ]
