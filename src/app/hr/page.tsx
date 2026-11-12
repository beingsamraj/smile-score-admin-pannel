"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { HRAccount, HRCreateInput, HRUpdateInput, Factory, Department } from "@/types/api";
import { api } from "@/lib/api";
import { AdminSidebar } from "@/components/AdminSidebar";
import { HRModal } from "@/components/HRModal";
import { ResetPasswordModal } from "@/components/ResetPasswordModal";
import {
  UserCog,
  Plus,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Building2,
  Network,
  Phone,
  Mail,
  KeyRound,
  Edit2,
  Power,
  Trash2,
  Eye,
  X,
} from "lucide-react";

export default function HRManagementPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && (!token || !user)) {
      router.replace("/login");
    }
  }, [authLoading, token, user, router]);

  const [hrAccounts, setHrAccounts] = useState<HRAccount[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFactoryId, setSelectedFactoryId] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHR, setEditingHR] = useState<HRAccount | null>(null);
  const [passwordTargetHR, setPasswordTargetHR] = useState<HRAccount | null>(null);
  const [viewingHR, setViewingHR] = useState<HRAccount | null>(null);

  // Load auxiliary selection data
  const loadAuxData = async () => {
    try {
      const [facs, depts] = await Promise.all([
        api.getFactories(),
        api.getDepartments(),
      ]);
      setFactories(facs);
      setDepartments(depts);
    } catch {
      // Ignore
    }
  };

  // Load HR Accounts
  const loadHRAccounts = async () => {
    setLoading(true);
    try {
      const data = await api.getHRAccounts(
        selectedFactoryId || undefined,
        selectedDeptId || undefined,
        statusFilter,
        search
      );
      setHrAccounts(data);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load HR accounts.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadAuxData();
      loadHRAccounts();
    }
  }, [token, selectedFactoryId, selectedDeptId, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadHRAccounts();
  };

  // Factory filter change in table
  const handleFactoryFilterChange = (facId: string) => {
    setSelectedFactoryId(facId);
    setSelectedDeptId(""); // Reset department filter if factory changed
  };

  // Filtered department options based on selected factory
  const filterDepartmentOptions = departments.filter((d) =>
    selectedFactoryId ? d.factory_id === selectedFactoryId : true
  );

  // Submit create or edit
  const handleModalSubmit = async (data: HRCreateInput | HRUpdateInput) => {
    if (editingHR) {
      await api.updateHR(editingHR.id, data as HRUpdateInput);
      setFeedback({ type: "success", text: `HR account '${data.full_name}' updated successfully.` });
    } else {
      await api.createHR(data as HRCreateInput);
      setFeedback({ type: "success", text: `HR account '${data.full_name}' registered successfully.` });
    }
    loadHRAccounts();
    loadAuxData();
  };

  // Status toggle
  const handleToggleStatus = async (hr: HRAccount) => {
    try {
      const nextStatus = !hr.is_active;
      await api.toggleHRStatus(hr.id, nextStatus);
      setFeedback({
        type: "success",
        text: `HR account '${hr.username}' is now ${nextStatus ? "Active" : "Inactive"}.`,
      });
      loadHRAccounts();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to toggle HR status.",
      });
    }
  };

  // Password Reset
  const handlePasswordResetSubmit = async (newPassword: string) => {
    if (!passwordTargetHR) return;
    await api.resetHRPassword(passwordTargetHR.id, { new_password: newPassword });
    setFeedback({
      type: "success",
      text: `Password for HR '${passwordTargetHR.username}' has been successfully reset.`,
    });
  };

  // Delete HR
  const handleDelete = async (hr: HRAccount) => {
    if (!confirm(`Are you sure you want to remove HR account '${hr.username}' (${hr.full_name})?`)) {
      return;
    }

    try {
      await api.deleteHR(hr.id);
      setFeedback({ type: "success", text: `HR account '${hr.username}' was removed.` });
      loadHRAccounts();
      loadAuxData();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to delete HR account.",
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
                Factory & Department Scoped
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#142D52] tracking-tight mt-1">
              HR Management
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Administer site-level Human Resources officer accounts, credentials, and organizational assignments
            </p>
          </div>

          <button
            onClick={() => {
              setEditingHR(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#142D52] hover:bg-[#0E203B] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Register HR Account</span>
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
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 bg-white p-3 border border-[#E2E8F0] rounded-xl shadow-xs">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search HR by name, username, email, or phone..."
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

          {/* Cascading dropdowns & filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Factory filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
              <Building2 className="w-3.5 h-3.5" />
              <select
                value={selectedFactoryId}
                onChange={(e) => handleFactoryFilterChange(e.target.value)}
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

            {/* Department filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
              <Network className="w-3.5 h-3.5" />
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#142D52] focus:outline-none focus:border-[#142D52]"
              >
                <option value="">All Departments</option>
                {filterDepartmentOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.department_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
              <Filter className="w-3.5 h-3.5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                className="px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#142D52] focus:outline-none focus:border-[#142D52]"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            <button
              onClick={() => {
                setSearch("");
                setSelectedFactoryId("");
                setSelectedDeptId("");
                setStatusFilter("all");
                loadHRAccounts();
              }}
              className="p-2 border border-[#E2E8F0] rounded-lg text-[#64748B] hover:text-[#142D52] hover:bg-[#EAF0F8] transition"
              title="Reset Filters"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* HR Accounts Table */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#142D52]">
              <thead className="bg-[#EAF0F8] text-[#142D52] font-semibold border-b border-[#D2E1F1] uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">HR Officer & Username</th>
                  <th className="py-3.5 px-4">Assigned Factory & Dept</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#64748B]">
                      <div className="w-6 h-6 border-2 border-[#142D52]/20 border-t-[#142D52] rounded-full animate-spin mx-auto mb-2" />
                      Loading HR officer directory...
                    </td>
                  </tr>
                ) : hrAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#64748B]">
                      <UserCog className="w-8 h-8 mx-auto mb-2 text-[#94A3B8]" />
                      No HR accounts found matching criteria.
                    </td>
                  </tr>
                ) : (
                  hrAccounts.map((hr) => (
                    <tr key={hr.id} className="hover:bg-slate-50/70 transition">
                      {/* Name & Username */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#EAF0F8] border border-[#D2E1F1] flex items-center justify-center text-[#142D52] flex-shrink-0">
                            <UserCog className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-[#142D52]">
                              {hr.full_name}
                            </div>
                            <div className="text-[11px] font-mono text-[#64748B]">
                              @{hr.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Factory & Department mapping */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-xs text-[#142D52] font-medium">
                          <Building2 className="w-3.5 h-3.5 text-[#64748B]" />
                          <span>{hr.factory_name || "Factory Plant"}</span>
                          <span className="text-[10px] font-mono text-[#64748B]">
                            ({hr.factory_code})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] mt-0.5">
                          <Network className="w-3 h-3 text-[#64748B]" />
                          <span>Dept: {hr.department_name} ({hr.department_code})</span>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="text-xs text-[#142D52] flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-[#64748B]" />
                          <span>{hr.email}</span>
                        </div>
                        <div className="text-[11px] text-[#64748B] flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-[#64748B]" />
                          <span>{hr.phone}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {hr.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            Inactive (Blocked)
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setViewingHR(hr)}
                            className="p-1.5 text-[#64748B] hover:text-[#142D52] hover:bg-[#EAF0F8] rounded-lg transition"
                            title="View HR Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingHR(hr);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-[#64748B] hover:text-[#142D52] hover:bg-[#EAF0F8] rounded-lg transition"
                            title="Edit HR Details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setPasswordTargetHR(hr)}
                            className="p-1.5 text-[#64748B] hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title="Reset HR Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(hr)}
                            className={`p-1.5 rounded-lg transition ${
                              hr.is_active
                                ? "text-[#64748B] hover:text-amber-600 hover:bg-amber-50"
                                : "text-[#64748B] hover:text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={hr.is_active ? "Deactivate HR" : "Activate HR"}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(hr)}
                            className="p-1.5 text-[#64748B] hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete HR Account"
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

        {/* Modal: Create & Edit */}
        <HRModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleModalSubmit}
          factories={factories}
          departments={departments}
          hrAccount={editingHR}
        />

        {/* Modal: Password Reset */}
        <ResetPasswordModal
          isOpen={Boolean(passwordTargetHR)}
          onClose={() => setPasswordTargetHR(null)}
          onSubmit={handlePasswordResetSubmit}
          hrAccount={passwordTargetHR}
        />

        {/* Modal: Profile View */}
        {viewingHR && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in duration-150">
              <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EAF0F8] border border-[#D2E1F1] flex items-center justify-center text-[#142D52]">
                    <UserCog className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#142D52]">{viewingHR.full_name}</h2>
                    <p className="text-xs text-[#64748B]">Role: {viewingHR.role.toUpperCase()}</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingHR(null)}
                  className="p-1.5 rounded-lg text-[#64748B] hover:text-[#142D52] hover:bg-[#EAF0F8] transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="space-y-2.5">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-[#64748B]">Username:</span>
                    <span className="font-semibold text-[#142D52]">@{viewingHR.username}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-[#64748B]">Email Address:</span>
                    <span className="font-semibold text-[#142D52]">{viewingHR.email}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-[#64748B]">Contact Phone:</span>
                    <span className="font-semibold text-[#142D52]">{viewingHR.phone}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-[#64748B]">Assigned Factory:</span>
                    <span className="font-semibold text-[#142D52]">
                      {viewingHR.factory_name} ({viewingHR.factory_code})
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-[#64748B]">Assigned Department:</span>
                    <span className="font-semibold text-[#142D52]">
                      {viewingHR.department_name} ({viewingHR.department_code})
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-[#64748B]">Account Status:</span>
                    <span className={`font-semibold ${viewingHR.is_active ? "text-emerald-700" : "text-red-700"}`}>
                      {viewingHR.is_active ? "Active" : "Inactive / Suspended"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#64748B]">Registered Date:</span>
                    <span className="font-semibold text-[#142D52]">
                      {new Date(viewingHR.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-[#E2E8F0] bg-slate-50 flex justify-end">
                <button
                  onClick={() => setViewingHR(null)}
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
