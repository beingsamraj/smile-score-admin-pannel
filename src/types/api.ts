export interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  department: string;
  designation: string;
  is_active: boolean;
  is_enrolled: boolean;
  enrolled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeCreateInput {
  employee_id: string;
  full_name: string;
  department: string;
  designation: string;
}

export interface EmployeeUpdateInput {
  full_name?: string;
  department?: string;
  designation?: string;
  is_active?: boolean;
}

export interface FaceEnrollmentResponse {
  success: boolean;
  message: string;
  samples_processed: number;
  enrolled_at: string;
}

export interface RecognitionLog {
  id: string;
  employee_id: string;
  employee_name: string;
  smile_score: number;
  confidence: number;
  timestamp: string;
  status: "verified" | "flagged" | "rejected";
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "superadmin" | "hr";
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AdminUser;
}

// -------------------------------------------------------------
// Factory Management Types
// -------------------------------------------------------------
export interface Factory {
  id: string;
  name: string;
  factory_code: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  email: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  departments_count?: number;
  hr_accounts_count?: number;
}

export interface FactoryCreateInput {
  name: string;
  factory_code: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  email: string;
  description?: string;
  is_active?: boolean;
}

export interface FactoryUpdateInput {
  name?: string;
  factory_code?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  description?: string;
  is_active?: boolean;
}

// -------------------------------------------------------------
// Department Management Types
// -------------------------------------------------------------
export interface Department {
  id: string;
  factory_id: string;
  factory_name?: string | null;
  factory_code?: string | null;
  name: string;
  department_code: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  hr_accounts_count?: number;
}

export interface DepartmentCreateInput {
  factory_id: string;
  name: string;
  department_code: string;
  description?: string;
  is_active?: boolean;
}

export interface DepartmentUpdateInput {
  factory_id?: string;
  name?: string;
  department_code?: string;
  description?: string;
  is_active?: boolean;
}

// -------------------------------------------------------------
// HR Management Types
// -------------------------------------------------------------
export interface HRAccount {
  id: string;
  factory_id: string;
  factory_name?: string | null;
  factory_code?: string | null;
  department_id: string;
  department_name?: string | null;
  department_code?: string | null;
  full_name: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string | null;
}

export interface HRCreateInput {
  factory_id: string;
  department_id: string;
  full_name: string;
  username: string;
  email: string;
  password: string;
  phone: string;
  is_active?: boolean;
}

export interface HRUpdateInput {
  factory_id?: string;
  department_id?: string;
  full_name?: string;
  username?: string;
  email?: string;
  phone?: string;
  is_active?: boolean;
}

export interface HRResetPasswordInput {
  new_password: string;
}

export interface ApiResponseSuccess {
  success: boolean;
  message: string;
}
