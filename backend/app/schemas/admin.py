from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


# Admin Schemas
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


# Admin User Management (Protected, Superadmin only)
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


# Employee Schemas
class EmployeeCreate(BaseModel):
    employee_id: str
    full_name: str
    department: str
    designation: str


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
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


# Emotion & Recognition Log Schemas
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


# Standard Status / Error Schemas
class MessageResponse(BaseModel):
    success: bool
    message: str
