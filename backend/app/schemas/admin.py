from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


# -------------------------------------------------------------
# Admin User & Auth Schemas
# -------------------------------------------------------------
class AdminLoginRequest(BaseModel):
    username: str = Field(..., description="Email or Username")
    password: str = Field(..., min_length=4)


class AdminUserResponse(BaseModel):
    id: str
    username: str
    email: EmailStr
    name: str
    role: str
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AdminUserResponse


class AdminCreateRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=128)
    password: str = Field(..., min_length=8)
    role: str = Field(default="admin", pattern="^(admin|superadmin)$")


class AdminUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[str] = None


# -------------------------------------------------------------
# Factory Schemas
# -------------------------------------------------------------
class FactoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    factory_code: str = Field(..., min_length=2, max_length=64)
    address: str = Field(..., min_length=3, max_length=255)
    city: str = Field(..., min_length=2, max_length=64)
    state: str = Field(..., min_length=2, max_length=64)
    country: str = Field(..., min_length=2, max_length=64)
    phone: str = Field(..., min_length=5, max_length=32)
    email: EmailStr
    description: Optional[str] = None
    is_active: bool = True


class FactoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=128)
    factory_code: Optional[str] = Field(None, min_length=2, max_length=64)
    address: Optional[str] = Field(None, min_length=3, max_length=255)
    city: Optional[str] = Field(None, min_length=2, max_length=64)
    state: Optional[str] = Field(None, min_length=2, max_length=64)
    country: Optional[str] = Field(None, min_length=2, max_length=64)
    phone: Optional[str] = Field(None, min_length=5, max_length=32)
    email: Optional[EmailStr] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class StatusToggleRequest(BaseModel):
    is_active: bool


class FactoryResponse(BaseModel):
    id: str
    name: str
    factory_code: str
    address: str
    city: str
    state: str
    country: str
    phone: str
    email: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    departments_count: Optional[int] = 0
    hr_accounts_count: Optional[int] = 0

    class Config:
        from_attributes = True


# -------------------------------------------------------------
# Department Schemas
# -------------------------------------------------------------
class DepartmentCreate(BaseModel):
    factory_id: str
    name: str = Field(..., min_length=2, max_length=128)
    department_code: str = Field(..., min_length=2, max_length=64)
    description: Optional[str] = None
    is_active: bool = True


class DepartmentUpdate(BaseModel):
    factory_id: Optional[str] = None
    name: Optional[str] = Field(None, min_length=2, max_length=128)
    department_code: Optional[str] = Field(None, min_length=2, max_length=64)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class DepartmentResponse(BaseModel):
    id: str
    factory_id: str
    factory_name: Optional[str] = None
    factory_code: Optional[str] = None
    name: str
    department_code: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    hr_accounts_count: Optional[int] = 0

    class Config:
        from_attributes = True


# -------------------------------------------------------------
# HR Management Schemas
# -------------------------------------------------------------
class HRCreateRequest(BaseModel):
    factory_id: str
    department_id: str
    full_name: str = Field(..., min_length=2, max_length=128)
    username: str = Field(..., min_length=3, max_length=64)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: str = Field(..., min_length=5, max_length=32)
    is_active: bool = True


class HRUpdateRequest(BaseModel):
    factory_id: Optional[str] = None
    department_id: Optional[str] = None
    full_name: Optional[str] = Field(None, min_length=2, max_length=128)
    phone: Optional[str] = Field(None, min_length=5, max_length=32)
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=64)
    is_active: Optional[bool] = None


class HRResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=6)


class HRResponse(BaseModel):
    id: str
    factory_id: str
    factory_name: Optional[str] = None
    factory_code: Optional[str] = None
    department_id: str
    department_name: Optional[str] = None
    department_code: Optional[str] = None
    full_name: str
    username: str
    email: str
    phone: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# -------------------------------------------------------------
# Employee & Log Schemas (Existing)
# -------------------------------------------------------------
class EmployeeCreate(BaseModel):
    employee_id: str
    full_name: str
    department: str
    designation: str
    factory_id: Optional[str] = None
    department_id: Optional[str] = None


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    factory_id: Optional[str] = None
    department_id: Optional[str] = None
    is_active: Optional[bool] = None


class EmployeeStatusUpdate(BaseModel):
    is_active: bool


class EmployeeResponse(BaseModel):
    id: str
    employee_id: str
    full_name: str
    department: str
    designation: str
    is_active: bool
    is_enrolled: bool
    enrolled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RecognitionLogResponse(BaseModel):
    id: str
    employee_id: str
    employee_name: str
    smile_score: float
    confidence: float
    timestamp: datetime
    status: str

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    success: bool
    message: str
