"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Employee,
  EmployeeCreateInput,
  EmployeeUpdateInput,
  DepartmentTransferInput,
  FactoryTransferInput,
  Factory,
  Department,
  HRAccount,
  EmployeeSummary,
} from "@/types/api";
import { api } from "@/lib/api";
import { AdminSidebar } from "@/components/AdminSidebar";
import { EmployeeModal } from "@/components/EmployeeModal";
import { EmployeeTransferModal } from "@/components/EmployeeTransferModal";
import { TransferHistoryModal } from "@/components/TransferHistoryModal";
import {
  Users,
  Plus,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Building2,
  Network,
  UserCog,
  Edit2,
  Trash2,
  ArrowLeftRight,
  History,
  Fingerprint,
  Smile,
  Power,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
} from "lucide-react";

export default function EmployeesPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && (!token || !user)) {
      router.replace("/login");
    }
  }, [authLoading, token, user, router]);

  // Data states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [summary, setSummary] = useState<EmployeeSummary | null>(null);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [hrAccounts, setHrAccounts] = useState<HRAccount[]>([]);

  // Filter & Pagination states
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFactoryId, setSelectedFactoryId] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedHrId, setSelectedHrId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modals
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [transferTargetEmployee, setTransferTargetEmployee] = useState<Employee | null>(null);
  const [historyTargetEmployee, setHistoryTargetEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);

  // Load auxiliary data (factories, departments, HRs, and summary KPIs)
  const loadAuxData = async () => {
    try {
      const [facs, depts, hrs, sum] = await Promise.all([
        api.getFactories(),
        api.getDepartments(),
        api.getHRAccounts(),
        api.getEmployeeSummary(),
      ]);
      setFactories(facs);
      setDepartments(depts);
      setHrAccounts(hrs);
      setSummary(sum);
    } catch {
      // Ignore
    }
  };

  // Load Paginated Employees
  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.getEmployees({
        search: search || undefined,
        factory_id: selectedFactoryId || undefined,
        department_id: selectedDeptId || undefined,
        hr_id: selectedHrId || undefined,
        status: statusFilter,
        page,
        size: 10,
      });
      setEmployees(res.items);
      setTotalPages(res.total_pages);
      setTotalCount(res.total);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load employees.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadAuxData();
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadEmployees();
    }
  }, [token, selectedFactoryId, selectedDeptId, selectedHrId, statusFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadEmployees();
  };

  const handleClearFilters = () => {
    setSearch("");
    setSelectedFactoryId("");
    setSelectedDeptId("");
    setSelectedHrId("");
    setStatusFilter("all");
    setPage(1);
  };

  // Sub-filter departments based on selected factory
  const filterDepartments = departments.filter((d) =>
    selectedFactoryId ? d.factory_id === selectedFactoryId : true
  );

  // Sub-filter HRs based on selected department / factory
  const filterHRs = hrAccounts.filter((h) => {
    if (selectedDeptId) return h.department_id === selectedDeptId;
    if (selectedFactoryId) return h.factory_id === selectedFactoryId;
    return true;
  });

  // Create / Edit submission
  const handleEmployeeModalSubmit = async (data: EmployeeCreateInput | EmployeeUpdateInput) => {
    if (editingEmployee) {
      await api.updateEmployee(editingEmployee.id, data as EmployeeUpdateInput);
      setFeedback({ type: "success", text: `Employee '${data.full_name}' updated successfully.` });
    } else {
      await api.createEmployee(data as EmployeeCreateInput);
      setFeedback({ type: "success", text: `Employee '${data.full_name}' registered successfully.` });
    }
    loadEmployees();
    loadAuxData();
  };

  // Department Transfer submission
  const handleDepartmentTransfer = async (empId: string, data: DepartmentTransferInput) => {
    await api.transferDepartment(empId, data);
    setFeedback({
      type: "success",
      text: "Department transfer completed successfully and logged to transfer history.",
    });
    loadEmployees();
    loadAuxData();
  };

  // Factory Transfer submission
  const handleFactoryTransfer = async (empId: string, data: FactoryTransferInput) => {
    await api.transferFactory(empId, data);
    setFeedback({
      type: "success",
      text: "Factory plant relocation completed successfully and logged to transfer history.",
    });
    loadEmployees();
    loadAuxData();
  };

  // Status toggle
  const handleToggleStatus = async (emp: Employee) => {
    try {
      const nextStatus = !emp.is_active;
      await api.toggleEmployeeActive(emp.id, nextStatus);
      setFeedback({
        type: "success",
        text: `Employee '${emp.full_name}' is now ${nextStatus ? "Active" : "Inactive"}.`,
      });
      loadEmployees();
      loadAuxData();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to toggle employee status.",
      });
    }
  };

  // Soft Delete
  const handleDelete = async (emp: Employee) => {
    if (
      !confirm(
        `Are you sure you want to soft-delete employee '${emp.full_name}' (ID: ${emp.employee_id})? Historical transfer and audit records will be preserved.`
      )
    ) {
      return;
    }

    try {
      await api.deleteEmployee(emp.id);
      setFeedback({
        type: "success",
        text: `Employee '${emp.full_name}' (${emp.employee_id}) was soft-deleted.`,
      });
      loadEmployees();
      loadAuxData();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to delete employee.",
      });
    }
  };

  if (authLoading || !token || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-[#142D52]">
        <div className="w-8 h-8 border-3 border-[#EAF0F8] border-t-[#142D52] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#142D52] flex flex-col lg:flex-row">
      <AdminSidebar backendStatus="online" />

      <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#EAF0F8] text-[#142D52]">
                Workforce Module
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#142D52] tracking-tight mt-1">
              Employee Management
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Manage employee records, organizational assignments, and transfers.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingEmployee(null);
              setIsEmployeeModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#142D52] hover:bg-[#0E203B] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs sm:text-sm flex items-center justify-between ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs font-semibold underline hover:opacity-80 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* B. Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white shadow-xs">
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Total Employees
            </div>
            <div className="text-2xl font-bold text-[#142D52] mt-1">
              {summary?.total_employees ?? totalCount}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white shadow-xs">
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Active Workforce
            </div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {summary?.active_employees ?? 0}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white shadow-xs">
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Inactive Employees
            </div>
            <div className="text-2xl font-bold text-slate-500 mt-1">
              {summary?.inactive_employees ?? 0}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white shadow-xs">
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Active Factories
            </div>
            <div className="text-2xl font-bold text-[#142D52] mt-1">
              {summary?.total_factories ?? factories.length}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white shadow-xs">
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Active Departments
            </div>
            <div className="text-2xl font-bold text-[#142D52] mt-1">
              {summary?.total_departments ?? departments.length}
            </div>
          </div>
        </div>

        {/* C. Search and Multi-level Filters */}
        <div className="bg-white p-4 border border-[#E2E8F0] rounded-xl shadow-xs space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Employee ID (numeric) or Employee Name..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-[#E2E8F0] rounded-lg text-[#142D52] placeholder-[#94A3B8] focus:outline-none focus:bg-white focus:border-[#142D52]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-[#142D52] text-white text-xs font-semibold rounded-lg hover:bg-[#0E203B] transition"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Filter by Factory */}
            <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
              <Building2 className="w-3.5 h-3.5" />
              <select
                value={selectedFactoryId}
                onChange={(e) => {
                  setSelectedFactoryId(e.target.value);
                  setSelectedDeptId("");
                  setSelectedHrId("");
                  setPage(1);
                }}
                className="px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#142D52] focus:outline-none focus:border-[#142D52]"
              >
                <option value="">All Factories</option>
                {factories.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.factory_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Department */}
            <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
              <Network className="w-3.5 h-3.5" />
              <select
                value={selectedDeptId}
                onChange={(e) => {
                  setSelectedDeptId(e.target.value);
                  setSelectedHrId("");
                  setPage(1);
                }}
                className="px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#142D52] focus:outline-none focus:border-[#142D52]"
              >
                <option value="">All Departments</option>
                {filterDepartments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.department_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by HR */}
            <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
              <UserCog className="w-3.5 h-3.5" />
              <select
                value={selectedHrId}
                onChange={(e) => {
                  setSelectedHrId(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#142D52] focus:outline-none focus:border-[#142D52]"
              >
                <option value="">All Assigned HRs</option>
                {filterHRs.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.full_name} (@{h.username})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Status */}
            <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
              <Filter className="w-3.5 h-3.5" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as "all" | "active" | "inactive");
                  setPage(1);
                }}
                className="px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#142D52] focus:outline-none focus:border-[#142D52]"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            <button
              onClick={handleClearFilters}
              className="px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#142D52] hover:bg-[#EAF0F8] rounded-lg border border-[#E2E8F0] transition"
            >
              Clear Filters
            </button>

            <button
              onClick={() => {
                loadEmployees();
                loadAuxData();
              }}
              className="p-1.5 text-[#64748B] hover:text-[#142D52] hover:bg-[#EAF0F8] rounded-lg border border-[#E2E8F0] transition ml-auto"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* D. Employee Table */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#142D52]">
              <thead className="bg-[#EAF0F8] text-[#142D52] font-semibold border-b border-[#D2E1F1] uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Employee ID</th>
                  <th className="py-3.5 px-4">Employee Name</th>
                  <th className="py-3.5 px-4">Factory</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Assigned HR</th>
                  <th className="py-3.5 px-4 text-center">Face ID</th>
                  <th className="py-3.5 px-4 text-center">Fingerprint ID</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[#64748B]">
                      <div className="w-6 h-6 border-2 border-[#142D52]/20 border-t-[#142D52] rounded-full animate-spin mx-auto mb-2" />
                      Loading employee directory...
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[#64748B]">
                      <Users className="w-8 h-8 mx-auto mb-2 text-[#94A3B8]" />
                      No employee records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                      {/* Employee ID (Numeric string, preserves leading zeros) */}
                      <td className="py-3.5 px-4 font-mono font-bold text-sm text-[#142D52]">
                        {emp.employee_id}
                      </td>

                      {/* Employee Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-sm text-[#142D52]">
                          {emp.full_name}
                        </div>
                        {emp.phone && (
                          <div className="text-[11px] text-[#64748B]">
                            {emp.phone}
                          </div>
                        )}
                      </td>

                      {/* Factory */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-xs text-[#142D52] flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#64748B]" />
                          <span>{emp.factory_name || "Unassigned"}</span>
                        </div>
                        {emp.factory_code && (
                          <div className="text-[10px] font-mono text-[#64748B] ml-5">
                            {emp.factory_code}
                          </div>
                        )}
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-xs text-[#142D52] flex items-center gap-1.5">
                          <Network className="w-3.5 h-3.5 text-[#64748B]" />
                          <span>{emp.department_name || "Unassigned"}</span>
                        </div>
                        {emp.department_code && (
                          <div className="text-[10px] font-mono text-[#64748B] ml-5">
                            {emp.department_code}
                          </div>
                        )}
                      </td>

                      {/* Assigned HR */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-xs text-[#142D52] flex items-center gap-1.5">
                          <UserCog className="w-3.5 h-3.5 text-[#64748B]" />
                          <span>{emp.assigned_hr_name || "Unassigned"}</span>
                        </div>
                        {emp.assigned_hr_username && (
                          <div className="text-[10px] text-[#64748B] ml-5">
                            @{emp.assigned_hr_username}
                          </div>
                        )}
                      </td>

                      {/* Face ID status */}
                      <td className="py-3.5 px-4 text-center">
                        {emp.has_face_enrolled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Smile className="w-3 h-3" />
                            Enrolled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            Not Enrolled
                          </span>
                        )}
                      </td>

                      {/* Fingerprint ID status */}
                      <td className="py-3.5 px-4 text-center">
                        {emp.has_fingerprint_enrolled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Fingerprint className="w-3 h-3" />
                            Enrolled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            Not Enrolled
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {emp.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions: Edit / Delete / Transfer */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setViewingEmployee(emp)}
                            className="p-1.5 text-[#64748B] hover:text-[#142D52] hover:bg-[#EAF0F8] rounded-lg transition"
                            title="View Employee Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingEmployee(emp);
                              setIsEmployeeModalOpen(true);
                            }}
                            className="p-1.5 text-[#64748B] hover:text-[#142D52] hover:bg-[#EAF0F8] rounded-lg transition"
                            title="Edit Employee"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setTransferTargetEmployee(emp)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                            title="Transfer (Department / Factory)"
                          >
                            <ArrowLeftRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setHistoryTargetEmployee(emp)}
                            className="p-1.5 text-[#64748B] hover:text-[#142D52] hover:bg-[#EAF0F8] rounded-lg transition"
                            title="Transfer History"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(emp)}
                            className={`p-1.5 rounded-lg transition ${
                              emp.is_active
                                ? "text-[#64748B] hover:text-amber-600 hover:bg-amber-50"
                                : "text-[#64748B] hover:text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={emp.is_active ? "Deactivate" : "Activate"}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(emp)}
                            className="p-1.5 text-[#64748B] hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Soft Delete Employee"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
              <div>
                Showing page <span className="font-semibold text-[#142D52]">{page}</span> of{" "}
                <span className="font-semibold text-[#142D52]">{totalPages}</span> ({totalCount} total)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-[#142D52] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#EAF0F8] transition flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-[#142D52] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#EAF0F8] transition flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal: Add & Edit Employee */}
        <EmployeeModal
          isOpen={isEmployeeModalOpen}
          onClose={() => setIsEmployeeModalOpen(false)}
          onSubmit={handleEmployeeModalSubmit}
          factories={factories}
          departments={departments}
          hrAccounts={hrAccounts}
          employee={editingEmployee}
        />

        {/* Modal: Transfer (Department / Factory) */}
        <EmployeeTransferModal
          isOpen={Boolean(transferTargetEmployee)}
          onClose={() => setTransferTargetEmployee(null)}
          employee={transferTargetEmployee}
          factories={factories}
          departments={departments}
          hrAccounts={hrAccounts}
          onDepartmentTransfer={handleDepartmentTransfer}
          onFactoryTransfer={handleFactoryTransfer}
        />

        {/* Modal: Transfer History */}
        <TransferHistoryModal
          isOpen={Boolean(historyTargetEmployee)}
          onClose={() => setHistoryTargetEmployee(null)}
          employee={historyTargetEmployee}
        />

        {/* Modal: View Details Profile */}
        {viewingEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in duration-150">
              <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EAF0F8] border border-[#D2E1F1] flex items-center justify-center text-[#142D52]">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#142D52]">{viewingEmployee.full_name}</h2>
                    <p className="text-xs text-[#64748B] font-mono">ID: {viewingEmployee.employee_id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingEmployee(null)}
                  className="p-1.5 rounded-lg text-[#64748B] hover:text-[#142D52] hover:bg-[#EAF0F8] transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="space-y-2.5">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-[#64748B]">Assigned Factory:</span>
                    <span className="font-semibold text-[#142D52]">
                      {viewingEmployee.factory_name} ({viewingEmployee.factory_code})
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-[#64748B]">Assigned Department:</span>
                    <span className="font-semibold text-[#142D52]">
                      {viewingEmployee.department_name} ({viewingEmployee.department_code})
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-[#64748B]">Assigned HR:</span>
                    <span className="font-semibold text-[#142D52]">
                      {viewingEmployee.assigned_hr_name} (@{viewingEmployee.assigned_hr_username})
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-[#64748B]">Contact Phone:</span>
                    <span className="font-semibold text-[#142D52]">{viewingEmployee.phone || "Not provided"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-[#64748B]">Email Address:</span>
                    <span className="font-semibold text-[#142D52]">{viewingEmployee.email || "Not provided"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-[#64748B]">Face Enrollment:</span>
                    <span className={`font-semibold ${viewingEmployee.has_face_enrolled ? "text-emerald-700" : "text-slate-500"}`}>
                      {viewingEmployee.has_face_enrolled ? "Enrolled" : "Not Enrolled"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-[#64748B]">Fingerprint Enrollment:</span>
                    <span className={`font-semibold ${viewingEmployee.has_fingerprint_enrolled ? "text-emerald-700" : "text-slate-500"}`}>
                      {viewingEmployee.has_fingerprint_enrolled ? "Enrolled" : "Not Enrolled"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#64748B]">Registration Date:</span>
                    <span className="font-semibold text-[#142D52]">
                      {new Date(viewingEmployee.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-[#E2E8F0] bg-slate-50 flex justify-end">
                <button
                  onClick={() => setViewingEmployee(null)}
                  className="px-4 py-2 text-xs font-semibold bg-[#142D52] text-white rounded-xl hover:bg-[#0E203B] transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
