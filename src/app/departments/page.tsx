"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Department, DepartmentCreateInput, DepartmentUpdateInput, Factory } from "@/types/api";
import { api } from "@/lib/api";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DepartmentModal } from "@/components/DepartmentModal";
import {
  Network,
  Plus,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Building2,
  Users,
  Edit2,
  Power,
  Trash2,
} from "lucide-react";

export default function DepartmentsPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && (!token || !user)) {
      router.replace("/login");
    }
  }, [authLoading, token, user, router]);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFactoryId, setSelectedFactoryId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);

  // Load Factories for selection
  const loadFactories = async () => {
    try {
      const data = await api.getFactories();
      setFactories(data);
    } catch {
      // Ignore
    }
  };

  // Load Departments
  const loadDepartments = async () => {
    setLoading(true);
    try {
      const data = await api.getDepartments(
        selectedFactoryId || undefined,
        statusFilter,
        search
      );
      setDepartments(data);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load departments.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadFactories();
      loadDepartments();
    }
  }, [token, selectedFactoryId, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadDepartments();
  };

  const handleModalSubmit = async (data: DepartmentCreateInput | DepartmentUpdateInput) => {
    if (editingDepartment) {
      await api.updateDepartment(editingDepartment.id, data as DepartmentUpdateInput);
      setFeedback({ type: "success", text: `Department '${data.name}' successfully updated.` });
    } else {
      await api.createDepartment(data as DepartmentCreateInput);
      setFeedback({ type: "success", text: `Department '${data.name}' created successfully.` });
    }
    loadDepartments();
  };

  const handleToggleStatus = async (dept: Department) => {
    try {
      const nextStatus = !dept.is_active;
      await api.toggleDepartmentStatus(dept.id, nextStatus);
      setFeedback({
        type: "success",
        text: `Department '${dept.name}' is now ${nextStatus ? "Active" : "Inactive"}.`,
      });
      loadDepartments();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to toggle department status.",
      });
    }
  };

  const handleDelete = async (dept: Department) => {
    if (
      !confirm(
        `Are you sure you want to delete department '${dept.name}' (${dept.department_code})?`
      )
    ) {
      return;
    }

    try {
      await api.deleteDepartment(dept.id);
      setFeedback({ type: "success", text: `Department '${dept.name}' has been deleted.` });
      loadDepartments();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to delete department.",
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
                Factory Dependent
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#142D52] tracking-tight mt-1">
              Department Management
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Organize departments strictly mapped under parent factories and maintain HR assignments
            </p>
          </div>

          <button
            onClick={() => {
              setEditingDepartment(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#142D52] hover:bg-[#0E203B] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Department</span>
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

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 border border-[#E2E8F0] rounded-xl shadow-xs">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search departments by name, code, description..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-[#E2E8F0] rounded-lg text-[#142D52] placeholder-[#94A3B8] focus:outline-none focus:bg-white focus:border-[#142D52]"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 bg-[#142D52] text-white text-xs font-semibold rounded-lg hover:bg-[#0E203B] transition"
            >
              Search
            </button>
          </form>

          {/* Factory filter & status */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Factory */}
            <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
              <Building2 className="w-3.5 h-3.5" />
              <select
                value={selectedFactoryId}
                onChange={(e) => setSelectedFactoryId(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#142D52] focus:outline-none focus:border-[#142D52]"
              >
                <option value="">All Factories</option>
                {factories.map((fac) => (
                  <option key={fac.id} value={fac.id}>
                    {fac.name} ({fac.factory_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Status */}
            <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
              <Filter className="w-3.5 h-3.5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                className="px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#142D52] focus:outline-none focus:border-[#142D52]"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            <button
              onClick={() => {
                setSearch("");
                setSelectedFactoryId("");
                setStatusFilter("all");
                loadDepartments();
              }}
              className="p-2 border border-[#E2E8F0] rounded-lg text-[#64748B] hover:text-[#142D52] hover:bg-[#EAF0F8] transition"
              title="Reset Filters"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Departments Table */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#142D52]">
              <thead className="bg-[#EAF0F8] text-[#142D52] font-semibold border-b border-[#D2E1F1] uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Department & Code</th>
                  <th className="py-3.5 px-4">Parent Factory</th>
                  <th className="py-3.5 px-4">Assigned HR</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#64748B]">
                      <div className="w-6 h-6 border-2 border-[#142D52]/20 border-t-[#142D52] rounded-full animate-spin mx-auto mb-2" />
                      Loading departments...
                    </td>
                  </tr>
                ) : departments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#64748B]">
                      <Network className="w-8 h-8 mx-auto mb-2 text-[#94A3B8]" />
                      No departments found for the selected filter.
                    </td>
                  </tr>
                ) : (
                  departments.map((dept) => (
                    <tr key={dept.id} className="hover:bg-slate-50/70 transition">
                      {/* Name & Code */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#EAF0F8] border border-[#D2E1F1] flex items-center justify-center text-[#142D52] flex-shrink-0">
                            <Network className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-[#142D52]">
                              {dept.name}
                            </div>
                            <div className="text-[11px] font-mono text-[#64748B]">
                              Code: {dept.department_code}
                            </div>
                            {dept.description && (
                              <div className="text-[11px] text-[#64748B] line-clamp-1 mt-0.5">
                                {dept.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Parent Factory */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-xs text-[#142D52]">
                          <Building2 className="w-3.5 h-3.5 text-[#64748B]" />
                          <span>{dept.factory_name || "Assigned Plant"}</span>
                        </div>
                        <div className="text-[11px] font-mono text-[#64748B] ml-5">
                          {dept.factory_code}
                        </div>
                      </td>

                      {/* Assigned HRs */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-[#142D52] rounded-lg text-xs font-medium">
                          <Users className="w-3 h-3 text-[#64748B]" />
                          {dept.hr_accounts_count || 0} HR Officer(s)
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {dept.is_active ? (
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

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingDepartment(dept);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-[#64748B] hover:text-[#142D52] hover:bg-[#EAF0F8] rounded-lg transition"
                            title="Edit Department"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(dept)}
                            className={`p-1.5 rounded-lg transition ${
                              dept.is_active
                                ? "text-[#64748B] hover:text-amber-600 hover:bg-amber-50"
                                : "text-[#64748B] hover:text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={dept.is_active ? "Deactivate Department" : "Activate Department"}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(dept)}
                            className="p-1.5 text-[#64748B] hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete Department"
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
        </div>

        {/* Modal */}
        <DepartmentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleModalSubmit}
          factories={factories}
          department={editingDepartment}
          defaultFactoryId={selectedFactoryId}
        />
      </main>
    </div>
  );
}
