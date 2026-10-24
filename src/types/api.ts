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
  role: "admin" | "superadmin";
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AdminUser;
}
