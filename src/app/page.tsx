"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Employee, RecognitionLog } from "@/types/api";
import { api } from "@/lib/api";
import { FaceEnrollmentModal } from "@/components/FaceEnrollmentModal";
import {
  Users,
  UserPlus,
  Smile,
  LogOut,
  Camera,
  Search,
  Shield,
  Activity,
  UserCheck,
  UserX,
  Server,
  Lock,
} from "lucide-react";

export default function Home() {
  const { user, token, isLoading: authLoading, login, logout, error: authError } = useAuth();

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);

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
      const data = await api.getEmployees(query);
      setEmployees(data);
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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginSubmitting(true);
    setActionMessage(null);
    try {
      await login(email, password);
    } catch {
      // Handled in context
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleRegisterEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    setActionMessage(null);
    try {
      await api.createEmployee({
        employee_id: newEmpId,
        full_name: newFullName,
        department: newDepartment,
        designation: newDesignation,
      });
      setActionMessage({ text: "Employee registered successfully!", type: "success" });
      setNewEmpId("");
      setNewFullName("");
      setNewDepartment("");
      setNewDesignation("");
      setActiveTab("employees");
      loadEmployees();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to register employee";
      setActionMessage({ text: msg, type: "error" });
    } finally {
      setRegistering(false);
    }
  };

  const handleToggleStatus = async (emp: Employee) => {
    try {
      await api.toggleEmployeeActive(emp.id, !emp.is_active);
      setActionMessage({
        text: `Employee ${emp.full_name} status updated.`,
        type: "success",
      });
      loadEmployees(searchQuery);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to change status";
      setActionMessage({ text: msg, type: "error" });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        <Activity className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Authentication View
  if (!token || !user) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-950 px-4 text-slate-100">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center mb-3 border border-indigo-500/30">
              <Smile className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Smile Score Admin</h1>
            <p className="text-sm text-slate-400 mt-1">Authorized Administrator Portal</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {authError && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-lg">
                {authError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Admin Username / Email
              </label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@smilescore.internal"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loginSubmitting}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 font-medium text-sm rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {loginSubmitting ? "Authenticating..." : "Sign In to Admin Panel"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-500 text-center">
            Shared FastAPI Backend at <code className="text-slate-400">http://localhost:8000/api/v1</code>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Smile className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-base leading-none block">Smile Score</span>
            <span className="text-xs text-slate-400">Administration Console</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
            <Server className={`w-3.5 h-3.5 ${backendStatus === "online" ? "text-emerald-400" : "text-amber-400"}`} />
            <span className="text-slate-300">FastAPI: {backendStatus}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>{user.name}</span>
          </div>

          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Alerts */}
        {actionMessage && (
          <div
            className={`p-4 rounded-xl border text-sm ${
              actionMessage.type === "success"
                ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
                : "bg-red-950/40 border-red-800 text-red-300"
            }`}
          >
            {actionMessage.text}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 gap-4">
          <button
            onClick={() => setActiveTab("employees")}
            className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition ${
              activeTab === "employees"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4" /> Employees Directory
          </button>

          <button
            onClick={() => setActiveTab("register")}
            className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition ${
              activeTab === "register"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserPlus className="w-4 h-4" /> Register Employee
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition ${
              activeTab === "logs"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="w-4 h-4" /> Recognition Activity
          </button>
        </div>

        {/* Tab 1: Employees List */}
        {activeTab === "employees" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, ID or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadEmployees(searchQuery)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={() => loadEmployees(searchQuery)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm font-medium rounded-lg text-slate-200"
              >
                Refresh
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-3">Employee ID</th>
                    <th className="px-6 py-3">Full Name</th>
                    <th className="px-6 py-3">Department</th>
                    <th className="px-6 py-3">Designation</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Face Enrolled</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {fetchingEmployees ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        Querying FastAPI backend...
                      </td>
                    </tr>
                  ) : employees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        No employee records found on backend. Add one to get started.
                      </td>
                    </tr>
                  ) : (
                    employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-800/40">
                        <td className="px-6 py-4 font-mono font-medium text-slate-200">
                          {emp.employee_id}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-100">{emp.full_name}</td>
                        <td className="px-6 py-4 text-slate-400">{emp.department}</td>
                        <td className="px-6 py-4 text-slate-400">{emp.designation}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              emp.is_active
                                ? "bg-emerald-950 border border-emerald-800 text-emerald-400"
                                : "bg-red-950 border border-red-800 text-red-400"
                            }`}
                          >
                            {emp.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              emp.is_enrolled
                                ? "bg-indigo-950 border border-indigo-800 text-indigo-400"
                                : "bg-amber-950 border border-amber-800 text-amber-400"
                            }`}
                          >
                            {emp.is_enrolled ? "Enrolled" : "Pending"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => setEnrollingEmployee(emp)}
                            className="px-2.5 py-1 text-xs bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 rounded border border-indigo-500/30 inline-flex items-center gap-1"
                          >
                            <Camera className="w-3.5 h-3.5" /> Enroll Face
                          </button>
                          <button
                            onClick={() => handleToggleStatus(emp)}
                            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 inline-flex items-center gap-1"
                          >
                            {emp.is_active ? (
                              <>
                                <UserX className="w-3.5 h-3.5 text-red-400" /> Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> Activate
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
          <div className="max-w-xl bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-4">Register New Employee</h3>
            <form onSubmit={handleRegisterEmployee} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Employee ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EMP-1001"
                  value={newEmpId}
                  onChange={(e) => setNewEmpId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Department *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Human Resources"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Designation *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Specialist"
                  value={newDesignation}
                  onChange={(e) => setNewDesignation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={registering}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition disabled:opacity-50"
              >
                {registering ? "Submitting to Backend..." : "Register Employee"}
              </button>
            </form>
          </div>
        )}

        {/* Tab 3: Recognition Activity */}
        {activeTab === "logs" && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-3">Timestamp</th>
                    <th className="px-6 py-3">Employee ID</th>
                    <th className="px-6 py-3">Employee Name</th>
                    <th className="px-6 py-3">Smile Score</th>
                    <th className="px-6 py-3">Confidence</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {fetchingLogs ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        Loading verification logs...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        No recognition logs found or shared FastAPI backend not connected.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40">
                        <td className="px-6 py-4 font-mono text-xs text-slate-400">{log.timestamp}</td>
                        <td className="px-6 py-4 font-mono text-slate-300">{log.employee_id}</td>
                        <td className="px-6 py-4 font-medium text-slate-200">{log.employee_name}</td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-indigo-400">{log.smile_score}%</span>
                        </td>
                        <td className="px-6 py-4 text-slate-400">{(log.confidence * 100).toFixed(1)}%</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              log.status === "verified"
                                ? "bg-emerald-950 border border-emerald-800 text-emerald-400"
                                : log.status === "flagged"
                                ? "bg-amber-950 border border-amber-800 text-amber-400"
                                : "bg-red-950 border border-red-800 text-red-400"
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
      </div>

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
  );
}
