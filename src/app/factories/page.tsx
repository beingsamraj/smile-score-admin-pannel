"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Factory, FactoryCreateInput, FactoryUpdateInput, Department, HRAccount } from "@/types/api";
import { api } from "@/lib/api";
import { AdminSidebar } from "@/components/AdminSidebar";
import { FactoryModal } from "@/components/FactoryModal";
import {
  Building2,
  Plus,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Building,
  MapPin,
  Phone,
  Mail,
  Network,
  Users,
  Edit2,
  Power,
  Trash2,
  Eye,
  X,
} from "lucide-react";

export default function FactoriesPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && (!token || !user)) {
      router.replace("/login");
    }
  }, [authLoading, token, user, router]);

  const [factories, setFactories] = useState<Factory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFactory, setEditingFactory] = useState<Factory | null>(null);
  const [viewingFactory, setViewingFactory] = useState<Factory | null>(null);
  const [viewingDepartments, setViewingDepartments] = useState<Department[]>([]);
  const [viewingHRs, setViewingHRs] = useState<HRAccount[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Load Factories
  const loadFactories = async () => {
    setLoading(true);
    try {
      const data = await api.getFactories(search, statusFilter);
      setFactories(data);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load factories.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadFactories();
    }
  }, [token, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadFactories();
  };

  // Add / Edit submission
  const handleModalSubmit = async (data: FactoryCreateInput | FactoryUpdateInput) => {
    if (editingFactory) {
      await api.updateFactory(editingFactory.id, data as FactoryUpdateInput);
      setFeedback({ type: "success", text: `Factory '${data.name}' successfully updated.` });
    } else {
      await api.createFactory(data as FactoryCreateInput);
      setFeedback({ type: "success", text: `Factory '${data.name}' created successfully.` });
    }
    loadFactories();
  };

  // Status toggle
  const handleToggleStatus = async (factory: Factory) => {
    try {
      const nextStatus = !factory.is_active;
      await api.toggleFactoryStatus(factory.id, nextStatus);
      setFeedback({
        type: "success",
        text: `Factory '${factory.name}' is now ${nextStatus ? "Active" : "Inactive"}.`,
      });
      loadFactories();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to toggle status.",
      });
    }
  };

  // Safe Delete
  const handleDelete = async (factory: Factory) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete '${factory.name}' (${factory.factory_code})? This requires zero associated departments or HR accounts.`
      )
    ) {
      return;
    }

    try {
      await api.deleteFactory(factory.id);
      setFeedback({ type: "success", text: `Factory '${factory.name}' has been deleted.` });
      loadFactories();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to delete factory.",
      });
    }
  };

  // Open detailed overview modal
  const handleViewDetails = async (factory: Factory) => {
    setViewingFactory(factory);
    setDetailLoading(true);
    try {
      const [depts, hrs] = await Promise.all([
        api.getFactoryDepartments(factory.id),
        api.getFactoryHRAccounts(factory.id),
      ]);
      setViewingDepartments(depts);
      setViewingHRs(hrs);
    } catch {
      // Keep empty lists on error
    } finally {
      setDetailLoading(false);
    }
  };

  if (authLoading || !token || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-[#142D52]">
        <div className="w-8 h-8 border-3 border-[#EAF0F8] border-t-[#142D52] rounded-full animate-spin" />
      </div>
    );
  }

  // Summary statistics
  const totalCount = factories.length;
  const activeCount = factories.filter((f) => f.is_active).length;
  const totalDepts = factories.reduce((sum, f) => sum + (f.departments_count || 0), 0);
  const totalHRs = factories.reduce((sum, f) => sum + (f.hr_accounts_count || 0), 0);

  return (
    <div className="min-h-screen bg-white text-[#142D52] flex flex-col lg:flex-row">
      <AdminSidebar backendStatus="online" />

      <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#EAF0F8] text-[#142D52]">
                Parent Entity
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#142D52] tracking-tight mt-1">
              Factory Management
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Manage multi-site plant locations, facilities, departments, and plant-level HR assignments
            </p>
          </div>

          <button
            onClick={() => {
              setEditingFactory(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#142D52] hover:bg-[#0E203B] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Factory</span>
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

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white shadow-xs">
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Total Plants
            </div>
            <div className="text-2xl font-bold text-[#142D52] mt-1">{totalCount}</div>
          </div>
          <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white shadow-xs">
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Active Factories
            </div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</div>
          </div>
          <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white shadow-xs">
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Total Departments
            </div>
            <div className="text-2xl font-bold text-[#142D52] mt-1">{totalDepts}</div>
          </div>
          <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white shadow-xs">
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Assigned HRs
            </div>
            <div className="text-2xl font-bold text-[#142D52] mt-1">{totalHRs}</div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 border border-[#E2E8F0] rounded-xl shadow-xs">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by factory name, code, city, state, or phone..."
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

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
              <Filter className="w-3.5 h-3.5" />
              <span>Status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
              className="px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#142D52] focus:outline-none focus:border-[#142D52]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                loadFactories();
              }}
              className="p-2 border border-[#E2E8F0] rounded-lg text-[#64748B] hover:text-[#142D52] hover:bg-[#EAF0F8] transition"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Table of Factories */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#142D52]">
              <thead className="bg-[#EAF0F8] text-[#142D52] font-semibold border-b border-[#D2E1F1] uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Plant & Code</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Hierarchy</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#64748B]">
                      <div className="w-6 h-6 border-2 border-[#142D52]/20 border-t-[#142D52] rounded-full animate-spin mx-auto mb-2" />
                      Loading factory records...
                    </td>
                  </tr>
                ) : factories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#64748B]">
                      <Building2 className="w-8 h-8 mx-auto mb-2 text-[#94A3B8]" />
                      No factories found matching your search.
                    </td>
                  </tr>
                ) : (
                  factories.map((fac) => (
                    <tr key={fac.id} className="hover:bg-slate-50/70 transition">
                      {/* Name & Code */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#EAF0F8] border border-[#D2E1F1] flex items-center justify-center text-[#142D52] flex-shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-[#142D52]">
                              {fac.name}
                            </div>
                            <div className="text-[11px] font-mono text-[#64748B]">
                              Code: {fac.factory_code}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-[#142D52] font-medium flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#64748B]" />
                          <span>{fac.city}, {fac.state}</span>
                        </div>
                        <div className="text-[11px] text-[#64748B] truncate max-w-xs">
                          {fac.address}, {fac.country}
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="text-xs text-[#142D52] flex items-center gap-1.5 font-medium">
                          <Phone className="w-3 h-3 text-[#64748B]" />
                          <span>{fac.phone}</span>
                        </div>
                        <div className="text-[11px] text-[#64748B] flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-[#64748B]" />
                          <span>{fac.email}</span>
                        </div>
                      </td>

                      {/* Hierarchy counters */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#EAF0F8] text-[#142D52] rounded text-[11px] font-medium">
                            <Network className="w-3 h-3" />
                            {fac.departments_count || 0} Depts
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-[#142D52] rounded text-[11px] font-medium">
                            <Users className="w-3 h-3" />
                            {fac.hr_accounts_count || 0} HR
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {fac.is_active ? (
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
                            onClick={() => handleViewDetails(fac)}
                            className="p-1.5 text-[#64748B] hover:text-[#142D52] hover:bg-[#EAF0F8] rounded-lg transition"
                            title="View Hierarchy Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingFactory(fac);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-[#64748B] hover:text-[#142D52] hover:bg-[#EAF0F8] rounded-lg transition"
                            title="Edit Factory"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(fac)}
                            className={`p-1.5 rounded-lg transition ${
                              fac.is_active
                                ? "text-[#64748B] hover:text-amber-600 hover:bg-amber-50"
                                : "text-[#64748B] hover:text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={fac.is_active ? "Deactivate Factory" : "Activate Factory"}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(fac)}
                            className="p-1.5 text-[#64748B] hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete Factory"
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

        {/* Create / Edit Modal */}
        <FactoryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleModalSubmit}
          factory={editingFactory}
        />

        {/* Detailed Overview Modal */}
        {viewingFactory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
              <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EAF0F8] border border-[#D2E1F1] flex items-center justify-center text-[#142D52]">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#142D52]">
                      {viewingFactory.name}
                    </h2>
                    <p className="text-xs text-[#64748B]">
                      Code: {viewingFactory.factory_code} • {viewingFactory.city}, {viewingFactory.country}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingFactory(null)}
                  className="p-1.5 rounded-lg text-[#64748B] hover:text-[#142D52] hover:bg-[#EAF0F8] transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Details card */}
                <div className="p-4 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-semibold text-[#142D52]">Address:</span> {viewingFactory.address}</div>
                    <div><span className="font-semibold text-[#142D52]">State/Country:</span> {viewingFactory.state}, {viewingFactory.country}</div>
                    <div><span className="font-semibold text-[#142D52]">Contact Phone:</span> {viewingFactory.phone}</div>
                    <div><span className="font-semibold text-[#142D52]">Email:</span> {viewingFactory.email}</div>
                  </div>
                  {viewingFactory.description && (
                    <div className="pt-2 border-t border-[#E2E8F0]">
                      <span className="font-semibold text-[#142D52]">Description:</span> {viewingFactory.description}
                    </div>
                  )}
                </div>

                {/* Sub-departments */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#142D52] mb-3 flex items-center gap-2">
                    <Network className="w-4 h-4" />
                    <span>Associated Departments ({viewingDepartments.length})</span>
                  </h3>
                  {detailLoading ? (
                    <div className="text-xs text-[#64748B] py-3 text-center">Loading departments...</div>
                  ) : viewingDepartments.length === 0 ? (
                    <div className="p-4 border border-dashed border-[#E2E8F0] rounded-xl text-xs text-center text-[#64748B]">
                      No departments configured under this factory yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {viewingDepartments.map((d) => (
                        <div key={d.id} className="p-3 border border-[#E2E8F0] rounded-xl bg-white shadow-2xs">
                          <div className="font-semibold text-xs text-[#142D52]">{d.name}</div>
                          <div className="text-[11px] font-mono text-[#64748B]">Code: {d.department_code}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sub-HR accounts */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#142D52] mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Assigned HR Officers ({viewingHRs.length})</span>
                  </h3>
                  {detailLoading ? (
                    <div className="text-xs text-[#64748B] py-3 text-center">Loading HRs...</div>
                  ) : viewingHRs.length === 0 ? (
                    <div className="p-4 border border-dashed border-[#E2E8F0] rounded-xl text-xs text-center text-[#64748B]">
                      No HR accounts assigned to this factory yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {viewingHRs.map((h) => (
                        <div key={h.id} className="p-3 border border-[#E2E8F0] rounded-xl bg-white shadow-2xs">
                          <div className="font-semibold text-xs text-[#142D52]">{h.full_name}</div>
                          <div className="text-[11px] text-[#64748B]">@{h.username} • {h.email}</div>
                          <div className="text-[10px] text-emerald-700 font-medium mt-1">Dept: {h.department_name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-[#E2E8F0] bg-slate-50 flex justify-end">
                <button
                  onClick={() => setViewingFactory(null)}
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
