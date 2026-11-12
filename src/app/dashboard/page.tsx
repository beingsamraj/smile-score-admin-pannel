"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Employee, RecognitionLog } from "@/types/api";
import { api } from "@/lib/api";
import { FaceEnrollmentModal } from "@/components/FaceEnrollmentModal";
import { AdminSidebar } from "@/components/AdminSidebar";
import Link from "next/link";
import {
  Users,
  UserPlus,
  LogOut,
  Camera,
  Search,
  Activity,
  UserCheck,
  UserX,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Building2,
  Network,
  UserCog,
  ArrowRight,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading, logout } = useAuth();

  // Route protection: redirect to login if unauthenticated
  useEffect(() => {
    if (!authLoading && (!token || !user)) {
      router.replace("/login");
    }
  }, [authLoading, token, user, router]);

  // Dashboard state
  const [activeTab, setActiveTab] = useState<"employees" | "register" | "logs">("employees");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [fetchingEmployees, setFetchingEmployees] = useState(false);
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Registration form
  const [newEmpId, setNewEmpId] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [newDesignation, setNewDesignation] = useState("");
  const [registering, setRegistering] = useState(false);

  // Face enrollment modal target
  const [enrollingEmployee, setEnrollingEmployee] = useState<Employee | null>(null);

  // Recognition logs state
  const [logs, setLogs] = useState<RecognitionLog[]>([]);
  const [fetchingLogs, setFetchingLogs] = useState(false);

  // Load employees
  const loadEmployees = async (query?: string) => {
    setFetchingEmployees(true);
    try {
      const res = await api.getEmployees({ search: query });
      setEmployees(res.items);
      setBackendStatus("online");
    } catch {
      setBackendStatus("offline");
    } finally {
      setFetchingEmployees(false);
    }
  };

  // Load logs
  const loadLogs = async () => {
    setFetchingLogs(true);
    try {
      const data = await api.getRecognitionLogs();
      setLogs(data);
    } catch {
      // Backend not yet providing logs
    } finally {
      setFetchingLogs(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadEmployees();
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === "logs" && token) {
      loadLogs();
    }
  }, [activeTab, token]);

  const handleRegisterEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    setActionMessage(null);
    try {
      await api.createEmployee({
        employee_id: newEmpId.trim(),
        full_name: newFullName.trim(),
        department: newDepartment.trim(),
        designation: newDesignation.trim(),
      });
      setActionMessage({ text: "Employee registered successfully!", type: "success" });
      setNewEmpId("");
      setNewFullName("");
      setNewDepartment("");
      setNewDesignation("");
      setActiveTab("employees");
      loadEmployees();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to register employee on backend.";
      setActionMessage({ text: msg, type: "error" });
    } finally {
      setRegistering(false);
    }
  };

  const handleToggleStatus = async (emp: Employee) => {
    try {
      await api.toggleEmployeeActive(emp.id, !emp.is_active);
      setActionMessage({
        text: `Employee ${emp.full_name} status updated successfully.`,
        type: "success",
      });
      loadEmployees(searchQuery);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update employee status on backend.";
      setActionMessage({ text: msg, type: "error" });
    }
  };

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  // While checking auth state or unauthenticated, block rendering dashboard content
  if (authLoading || !token || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-[#142D52]">
        <div className="w-8 h-8 border-3 border-[#EAF0F8] border-t-[#142D52] rounded-full animate-spin mb-4" />
        <p className="text-xs font-medium text-[#64748B]">Verifying Administrator Permissions...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#142D52] flex flex-col lg:flex-row">
      <AdminSidebar backendStatus={backendStatus} />

      <div className="flex-1 flex flex-col overflow-x-hidden">
        {/* Top Header */}
        <header className="border-b border-[#E2E8F0] bg-white sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-xs">
          <div>
            <h1 className="text-base font-bold text-[#142D52] tracking-tight">Workforce & Smile Score Operations</h1>
            <p className="text-xs text-[#64748B]">Overview of employee enrollment, recognition scans, and organization mapping</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs bg-[#EAF0F8] px-3 py-1.5 rounded-full border border-[#D2E1F1]">
              <Server
                className={`w-3.5 h-3.5 ${
                  backendStatus === "online" ? "text-emerald-600" : "text-amber-600"
                }`}
              />
              <span className="font-medium text-[#142D52]">
                FastAPI: {backendStatus === "online" ? "Online" : "Checking..."}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-[#64748B] hover:text-[#142D52] hover:bg-[#EAF0F8] rounded-lg transition"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 space-y-6">
          {/* Quick Nav Cards for Core Modules */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/factories"
              className="p-4 rounded-2xl border border-[#E2E8F0] bg-white hover:border-[#142D52] hover:shadow-md transition group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-[#EAF0F8] border border-[#D2E1F1] flex items-center justify-center text-[#142D52]">
                  <Building2 className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#142D52] group-hover:translate-x-0.5 transition" />
              </div>
              <div className="font-bold text-sm text-[#142D52]">Factory Management</div>
              <p className="text-xs text-[#64748B] mt-0.5">Primary multi-plant configuration, codes, and facilities</p>
            </Link>

            <Link
              href="/departments"
              className="p-4 rounded-2xl border border-[#E2E8F0] bg-white hover:border-[#142D52] hover:shadow-md transition group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-[#EAF0F8] border border-[#D2E1F1] flex items-center justify-center text-[#142D52]">
                  <Network className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#142D52] group-hover:translate-x-0.5 transition" />
              </div>
              <div className="font-bold text-sm text-[#142D52]">Department Management</div>
              <p className="text-xs text-[#64748B] mt-0.5">Factory-scoped departments and operational divisions</p>
            </Link>

            <Link
              href="/hr"
              className="p-4 rounded-2xl border border-[#E2E8F0] bg-white hover:border-[#142D52] hover:shadow-md transition group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-[#EAF0F8] border border-[#D2E1F1] flex items-center justify-center text-[#142D52]">
                  <UserCog className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#142D52] group-hover:translate-x-0.5 transition" />
              </div>
              <div className="font-bold text-sm text-[#142D52]">HR Management</div>
              <p className="text-xs text-[#64748B] mt-0.5">Plant-level HR accounts, role privileges, and credentials</p>
            </Link>
          </div>
        {/* Action Alerts */}
        {actionMessage && (
          <div
            className={`p-4 rounded-xl border text-xs sm:text-sm flex items-center justify-between ${
              actionMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              )}
              <span>{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-xs font-semibold underline hover:opacity-80 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#E2E8F0] gap-6">
          <button
            onClick={() => setActiveTab("employees")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === "employees"
                ? "border-[#142D52] text-[#142D52]"
                : "border-transparent text-[#64748B] hover:text-[#142D52]"
            }`}
          >
            <Users className="w-4 h-4" /> Employees Directory
          </button>

          <button
            onClick={() => setActiveTab("register")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === "register"
                ? "border-[#142D52] text-[#142D52]"
                : "border-transparent text-[#64748B] hover:text-[#142D52]"
            }`}
          >
            <UserPlus className="w-4 h-4" /> Register Employee
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === "logs"
                ? "border-[#142D52] text-[#142D52]"
                : "border-transparent text-[#64748B] hover:text-[#142D52]"
            }`}
          >
            <Activity className="w-4 h-4" /> Recognition Activity
          </button>
        </div>

        {/* Tab 1: Employee Directory */}
        {activeTab === "employees" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by ID, name or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadEmployees(searchQuery)}
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#142D52] placeholder-[#94A3B8] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52] transition"
                />
              </div>

              <button
                onClick={() => loadEmployees(searchQuery)}
                className="px-4 py-2.5 bg-[#EAF0F8] hover:bg-[#D7E5F3] border border-[#D2E1F1] text-xs font-semibold rounded-xl text-[#142D52] flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${fetchingEmployees ? "animate-spin" : ""}`} />
                Refresh Directory
              </button>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-x-auto shadow-xs">
              <table className="w-full text-left text-sm text-[#142D52]">
                <thead className="bg-[#EAF0F8] border-b border-[#E2E8F0] text-xs uppercase font-semibold text-[#142D52]">
                  <tr>
                    <th className="px-6 py-3.5">Employee ID</th>
                    <th className="px-6 py-3.5">Full Name</th>
                    <th className="px-6 py-3.5">Department</th>
                    <th className="px-6 py-3.5">Designation</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Face Enrolled</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {fetchingEmployees ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-[#64748B]">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-[#EAF0F8] border-t-[#142D52] rounded-full animate-spin" />
                          <span>Loading employee records from FastAPI backend...</span>
                        </div>
                      </td>
                    </tr>
                  ) : employees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-[#64748B]">
                        No employee records found on backend. Click &quot;Register Employee&quot; to add one.
                      </td>
                    </tr>
                  ) : (
                    employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-[#EAF0F8]/40 transition">
                        <td className="px-6 py-4 font-mono font-medium text-xs text-[#142D52]">
                          {emp.employee_id}
                        </td>
                        <td className="px-6 py-4 font-semibold text-[#142D52]">{emp.full_name}</td>
                        <td className="px-6 py-4 text-[#64748B] text-xs">
                          {emp.department_name || emp.department || "—"}
                        </td>
                        <td className="px-6 py-4 text-[#64748B] text-xs">{emp.designation || "—"}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                              emp.is_active
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-red-50 text-red-800 border border-red-200"
                            }`}
                          >
                            {emp.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                              emp.is_enrolled
                                ? "bg-[#EAF0F8] text-[#142D52] border border-[#D2E1F1]"
                                : "bg-amber-50 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {emp.is_enrolled ? "Enrolled" : "Pending"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => setEnrollingEmployee(emp)}
                            className="px-3 py-1.5 text-xs bg-[#142D52] hover:bg-[#0E203B] text-white rounded-lg shadow-2xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5" /> Enroll Face
                          </button>
                          <button
                            onClick={() => handleToggleStatus(emp)}
                            className="px-3 py-1.5 text-xs bg-white hover:bg-[#EAF0F8] text-[#142D52] rounded-lg border border-[#E2E8F0] font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
                          >
                            {emp.is_active ? (
                              <>
                                <UserX className="w-3.5 h-3.5 text-red-600" /> Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Activate
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Register Employee */}
        {activeTab === "register" && (
          <div className="max-w-xl bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 shadow-xs">
            <h3 className="text-lg font-bold text-[#142D52] mb-1">Register New Employee</h3>
            <p className="text-xs text-[#64748B] mb-6">
              Create an employee record in the central database before performing biometric enrollment.
            </p>
            <form onSubmit={handleRegisterEmployee} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1.5">
                  Employee ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EMP-1001"
                  value={newEmpId}
                  onChange={(e) => setNewEmpId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm text-[#142D52] placeholder-[#94A3B8] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Doe"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm text-[#142D52] placeholder-[#94A3B8] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1.5">
                  Department *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Assembly Line A"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm text-[#142D52] placeholder-[#94A3B8] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1.5">
                  Designation *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Machine Operator"
                  value={newDesignation}
                  onChange={(e) => setNewDesignation(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm text-[#142D52] placeholder-[#94A3B8] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52] transition"
                />
              </div>

              <button
                type="submit"
                disabled={registering}
                className="w-full mt-4 py-3 bg-[#142D52] hover:bg-[#0E203B] text-white font-semibold text-sm rounded-xl shadow-xs transition disabled:opacity-60 cursor-pointer"
              >
                {registering ? "Submitting to Backend..." : "Register Employee"}
              </button>
            </form>
          </div>
        )}

        {/* Tab 3: Recognition Activity */}
        {activeTab === "logs" && (
          <div className="space-y-4">
            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-x-auto shadow-xs">
              <table className="w-full text-left text-sm text-[#142D52]">
                <thead className="bg-[#EAF0F8] border-b border-[#E2E8F0] text-xs uppercase font-semibold text-[#142D52]">
                  <tr>
                    <th className="px-6 py-3.5">Timestamp</th>
                    <th className="px-6 py-3.5">Employee ID</th>
                    <th className="px-6 py-3.5">Employee Name</th>
                    <th className="px-6 py-3.5">Smile Score</th>
                    <th className="px-6 py-3.5">Confidence</th>
                    <th className="px-6 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {fetchingLogs ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-[#64748B]">
                        Loading recognition logs from backend...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-[#64748B]">
                        No recognition logs found or shared FastAPI backend pending logs integration.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#EAF0F8]/40 transition">
                        <td className="px-6 py-4 font-mono text-xs text-[#64748B]">{log.timestamp}</td>
                        <td className="px-6 py-4 font-mono text-xs font-medium text-[#142D52]">
                          {log.employee_id}
                        </td>
                        <td className="px-6 py-4 font-semibold text-[#142D52]">{log.employee_name}</td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-[#142D52]">{log.smile_score}%</span>
                        </td>
                        <td className="px-6 py-4 text-xs text-[#64748B]">
                          {(log.confidence * 100).toFixed(1)}%
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                              log.status === "verified"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : log.status === "flagged"
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-red-50 text-red-800 border border-red-200"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Face Enrollment Modal */}
      {enrollingEmployee && (
        <FaceEnrollmentModal
          employeeId={enrollingEmployee.employee_id}
          employeeName={enrollingEmployee.full_name}
          onEnrollmentComplete={() => {
            setEnrollingEmployee(null);
            loadEmployees(searchQuery);
          }}
          onCancel={() => setEnrollingEmployee(null)}
        />
      )}
      </div>
    </div>
  );
}
