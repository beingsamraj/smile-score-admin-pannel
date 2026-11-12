import {
  AdminUser,
  AuthResponse,
  Employee,
  EmployeeCreateInput,
  EmployeeUpdateInput,
  FaceEnrollmentResponse,
  RecognitionLog,
  Factory,
  FactoryCreateInput,
  FactoryUpdateInput,
  Department,
  DepartmentCreateInput,
  DepartmentUpdateInput,
  HRAccount,
  HRCreateInput,
  HRUpdateInput,
  HRResetPasswordInput,
  ApiResponseSuccess,
} from "@/types/api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("admin_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeader(),
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("admin_access_token");
        localStorage.removeItem("admin_user");
        window.dispatchEvent(new Event("auth:unauthorized"));
      }
      throw new ApiError("Invalid credentials or session expired.", 401);
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message =
        errorBody.detail ||
        errorBody.message ||
        `Request failed with status ${response.status}`;
      throw new ApiError(message, response.status);
    }

    return await response.json();
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      `FastAPI Backend unreachable at ${API_BASE_URL}. Ensure backend service is running.`,
      503
    );
  }
}

export const api = {
  // Auth
  login: async (identifier: string, password: string): Promise<AuthResponse> => {
    const response = await request<Record<string, unknown>>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: identifier, password }),
    });

    if (response.access_token) {
      return response as unknown as AuthResponse;
    }

    if (response.user && typeof response.user === "object") {
      const u = response.user as Record<string, unknown>;
      const token = (u.token as string) || (response.token as string) || "";
      return {
        access_token: token,
        token_type: "bearer",
        user: {
          id: (u.user_id as string) || (u.id as string) || "admin",
          email: (u.email as string) || (u.username as string) || identifier,
          name: (u.full_name as string) || (u.username as string) || "Administrator",
          role: (u.user_role as "admin") || "admin",
        },
      };
    }

    throw new ApiError("Unexpected response structure from login API", 500);
  },

  getCurrentAdmin: async (): Promise<AdminUser> => {
    return request<AdminUser>("/auth/me");
  },

  // -------------------------------------------------------------
  // Factory Management APIs
  // -------------------------------------------------------------
  getFactories: async (search?: string, status?: "all" | "active" | "inactive"): Promise<Factory[]> => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (status && status !== "all") params.append("status", status);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<Factory[]>(`/factories${qs}`);
  },

  getFactoryById: async (id: string): Promise<Factory> => {
    return request<Factory>(`/factories/${id}`);
  },

  createFactory: async (data: FactoryCreateInput): Promise<Factory> => {
    return request<Factory>("/factories", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateFactory: async (id: string, data: FactoryUpdateInput): Promise<Factory> => {
    return request<Factory>(`/factories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  toggleFactoryStatus: async (id: string, isActive: boolean): Promise<Factory> => {
    return request<Factory>(`/factories/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: isActive }),
    });
  },

  deleteFactory: async (id: string): Promise<ApiResponseSuccess> => {
    return request<ApiResponseSuccess>(`/factories/${id}`, {
      method: "DELETE",
    });
  },

  getFactoryDepartments: async (id: string): Promise<Department[]> => {
    return request<Department[]>(`/factories/${id}/departments`);
  },

  getFactoryHRAccounts: async (id: string): Promise<HRAccount[]> => {
    return request<HRAccount[]>(`/factories/${id}/hr`);
  },

  // -------------------------------------------------------------
  // Department Management APIs
  // -------------------------------------------------------------
  getDepartments: async (
    factoryId?: string,
    status?: "all" | "active" | "inactive",
    search?: string
  ): Promise<Department[]> => {
    const params = new URLSearchParams();
    if (factoryId) params.append("factory_id", factoryId);
    if (status && status !== "all") params.append("status", status);
    if (search) params.append("search", search);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<Department[]>(`/departments${qs}`);
  },

  getDepartmentById: async (id: string): Promise<Department> => {
    return request<Department>(`/departments/${id}`);
  },

  createDepartment: async (data: DepartmentCreateInput): Promise<Department> => {
    return request<Department>("/departments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateDepartment: async (id: string, data: DepartmentUpdateInput): Promise<Department> => {
    return request<Department>(`/departments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  toggleDepartmentStatus: async (id: string, isActive: boolean): Promise<Department> => {
    return request<Department>(`/departments/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: isActive }),
    });
  },

  deleteDepartment: async (id: string): Promise<ApiResponseSuccess> => {
    return request<ApiResponseSuccess>(`/departments/${id}`, {
      method: "DELETE",
    });
  },

  // -------------------------------------------------------------
  // HR Management APIs
  // -------------------------------------------------------------
  getHRAccounts: async (
    factoryId?: string,
    departmentId?: string,
    status?: "all" | "active" | "inactive",
    search?: string
  ): Promise<HRAccount[]> => {
    const params = new URLSearchParams();
    if (factoryId) params.append("factory_id", factoryId);
    if (departmentId) params.append("department_id", departmentId);
    if (status && status !== "all") params.append("status", status);
    if (search) params.append("search", search);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<HRAccount[]>(`/hr${qs}`);
  },

  getHRById: async (id: string): Promise<HRAccount> => {
    return request<HRAccount>(`/hr/${id}`);
  },

  createHR: async (data: HRCreateInput): Promise<HRAccount> => {
    return request<HRAccount>("/hr", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateHR: async (id: string, data: HRUpdateInput): Promise<HRAccount> => {
    return request<HRAccount>(`/hr/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  toggleHRStatus: async (id: string, isActive: boolean): Promise<HRAccount> => {
    return request<HRAccount>(`/hr/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: isActive }),
    });
  },

  resetHRPassword: async (id: string, data: HRResetPasswordInput): Promise<ApiResponseSuccess> => {
    return request<ApiResponseSuccess>(`/hr/${id}/reset-password`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteHR: async (id: string): Promise<ApiResponseSuccess> => {
    return request<ApiResponseSuccess>(`/hr/${id}`, {
      method: "DELETE",
    });
  },

  // -------------------------------------------------------------
  // Employees & Face Enrollment
  // -------------------------------------------------------------
  getEmployees: async (search?: string): Promise<Employee[]> => {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    return request<Employee[]>(`/employees${query}`);
  },

  getEmployeeById: async (id: string): Promise<Employee> => {
    return request<Employee>(`/employees/${id}`);
  },

  createEmployee: async (data: EmployeeCreateInput): Promise<Employee> => {
    return request<Employee>("/employees", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateEmployee: async (id: string, data: EmployeeUpdateInput): Promise<Employee> => {
    return request<Employee>(`/employees/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  toggleEmployeeActive: async (id: string, isActive: boolean): Promise<Employee> => {
    return request<Employee>(`/employees/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: isActive }),
    });
  },

  enrollFaceSamples: async (
    employeeId: string,
    sampleBlobs: Blob[]
  ): Promise<FaceEnrollmentResponse> => {
    const url = `${API_BASE_URL}/employees/${employeeId}/enroll-face`;
    const formData = new FormData();
    sampleBlobs.forEach((blob, idx) => {
      formData.append("files", blob, `sample_${idx + 1}.jpg`);
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...getAuthHeader(),
      },
      body: formData,
    });

    if (response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("admin_access_token");
        window.dispatchEvent(new Event("auth:unauthorized"));
      }
      throw new ApiError("Session expired or unauthorized.", 401);
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new ApiError(
        err.detail || err.message || "Failed to enroll face samples on backend.",
        response.status
      );
    }

    return await response.json();
  },

  revokeFaceEnrollment: async (employeeId: string): Promise<{ success: boolean; message: string }> => {
    return request<{ success: boolean; message: string }>(`/employees/${employeeId}/enroll-face`, {
      method: "DELETE",
    });
  },

  getRecognitionLogs: async (limit = 50): Promise<RecognitionLog[]> => {
    return request<RecognitionLog[]>(`/recognition/logs?limit=${limit}`);
  },
};
