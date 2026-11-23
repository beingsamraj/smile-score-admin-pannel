"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  RefreshCw,
  Search,
  Scan,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  Trash2,
  Eye,
  Filter,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AdminSidebar } from "@/components/AdminSidebar";
import { FaceEnrollmentModal } from "@/components/FaceEnrollmentModal";
import { FaceTesterDrawer } from "@/components/FaceTesterDrawer";
import { FaceGalleryModal } from "@/components/FaceGalleryModal";
import { api } from "@/lib/api";
import { FaceSummary, FaceEmployeeItem, Factory, Department } from "@/types/api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export default function FacesPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();

  // Route protection
  useEffect(() => {
    if (!authLoading && (!token || !user)) {
      router.replace("/login");
    }
  }, [authLoading, token, user, router]);

  const [summary, setSummary] = useState<FaceSummary | null>(null);
  const [employees, setEmployees] = useState<FaceEmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "enrolled" | "pending">("all");
  const [factoryFilter, setFactoryFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  const [factories, setFactories] = useState<Factory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Modals state
  const [enrollingEmp, setEnrollingEmp] = useState<FaceEmployeeItem | null>(null);
  const [viewingEmp, setViewingEmp] = useState<FaceEmployeeItem | null>(null);
  const [isTesterOpen, setIsTesterOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load KPI summary
  const loadSummary = useCallback(async () => {
    try {
      const data = await api.getFaceSummary();
      setSummary(data);
    } catch {
      // Ignored
    }
  }, []);

  // Load roster
  const loadRoster = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getFaceRoster({
        status: statusFilter,
        factory_id: factoryFilter || undefined,
        department_id: departmentFilter || undefined,
        search: search || undefined,
      });
      setEmployees(data);
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, factoryFilter, departmentFilter, search]);

  // Load filters metadata
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [facs, depts] = await Promise.all([
          api.getFactories("active"),
          api.getDepartments(),
        ]);
        setFactories(facs);
        setDepartments(depts);
      } catch {
        // Ignored
      }
    };
    if (token) {
      loadMeta();
      loadSummary();
      loadRoster();
    }
  }, [token, loadSummary, loadRoster]);

  const handleDeleteFace = async (emp: FaceEmployeeItem) => {
    if (!confirm(`Are you sure you want to delete face templates for ${emp.full_name}?`)) return;
    try {
      await api.deleteFaceBiometrics(emp.id);
      setActionMessage({ type: "success", text: `Cleared face templates for ${emp.full_name}.` });
      loadSummary();
      loadRoster();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete face templates.";
      setActionMessage({ type: "error", text: msg });
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#142D52] flex flex-col lg:flex-row">
      <AdminSidebar backendStatus="online" />

      <main className="flex-1 p-6 lg:p-10 space-y-8 overflow-y-auto max-w-7xl">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAF0F8] pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#142D52] flex items-center gap-2.5">
              <Camera className="w-6 h-6 text-[#142D52]" />
              <span>Face Biometrics Management</span>
            </h1>
            <p className="text-xs text-[#64748B] mt-1">
              5-angle multi-sample enrollment, normalized vector extraction & live biometric testing
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsTesterOpen(true)}
              className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition flex items-center gap-2 shadow-xs"
            >
              <Scan className="w-4 h-4" />
              <span>Open Live Match Tester (1:N)</span>
            </button>
          </div>
        </div>

        {/* Action Message Alert */}
        {actionMessage && (
          <div
            className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between transition ${
              actionMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            <span>{actionMessage.text}</span>
            <button onClick={() => setActionMessage(null)} className="text-[#64748B] hover:text-[#142D52]">
              Dismiss
            </button>
          </div>
        )}

        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#EAF0F8]/40 border border-[#EAF0F8] space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Total Workforce
            </span>
            <p className="text-2xl font-extrabold text-[#142D52]">{summary?.total_employees ?? "—"}</p>
            <span className="text-[11px] text-[#64748B]">Registered employees</span>
          </div>

          <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Enrolled Faces
            </span>
            <p className="text-2xl font-extrabold text-emerald-900">{summary?.enrolled_employees ?? "—"}</p>
            <span className="text-[11px] text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Biometrics active
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200/60 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Pending Enrollment
            </span>
            <p className="text-2xl font-extrabold text-amber-900">{summary?.pending_employees ?? "—"}</p>
            <span className="text-[11px] text-amber-600 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Awaiting 5-angle scan
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-[#EAF0F8]/40 border border-[#EAF0F8] space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Face Templates
            </span>
            <p className="text-2xl font-extrabold text-[#142D52]">{summary?.total_face_templates ?? "—"}</p>
            <span className="text-[11px] text-[#64748B] flex items-center gap-1">
              <Layers className="w-3 h-3" /> Compressed vectors stored
            </span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="p-4 rounded-2xl bg-gray-50/60 border border-[#EAF0F8] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                placeholder="Search by Employee ID or Name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#142D52] transition shadow-2xs"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "enrolled" | "pending")}
              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-[#142D52] focus:outline-none focus:border-[#142D52] transition shadow-2xs"
            >
              <option value="all">All Biometric Statuses</option>
              <option value="enrolled">Enrolled Only</option>
              <option value="pending">Pending Enrollment</option>
            </select>

            {/* Factory Filter */}
            <select
              value={factoryFilter}
              onChange={(e) => setFactoryFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-[#142D52] focus:outline-none focus:border-[#142D52] transition shadow-2xs"
            >
              <option value="">All Factories</option>
              {factories.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setFactoryFilter("");
              setDepartmentFilter("");
            }}
            className="px-3 py-2 text-xs text-[#64748B] hover:text-[#142D52] font-semibold transition"
          >
            Reset Filters
          </button>
        </div>

        {/* Employee Biometric Table */}
        <div className="border border-[#EAF0F8] rounded-2xl overflow-hidden shadow-xs bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EAF0F8]/50 text-[#64748B] font-semibold uppercase tracking-wider text-[11px] border-b border-[#EAF0F8]">
              <tr>
                <th className="px-6 py-3.5">Employee</th>
                <th className="px-6 py-3.5">Factory & Dept</th>
                <th className="px-6 py-3.5">Biometrics Status</th>
                <th className="px-6 py-3.5">Angle Samples</th>
                <th className="px-6 py-3.5">Enrolled Date</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAF0F8]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#64748B]">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#142D52]" />
                      <span>Loading face enrollment records...</span>
                    </div>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#64748B]">
                    No employee face records found matching filter criteria.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-[#EAF0F8]/30 transition">
                    {/* Employee Profile & Thumbnail */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden border border-gray-200 flex items-center justify-center shrink-0">
                          {emp.primary_thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`${API_BASE_URL}${emp.primary_thumbnail_url}`}
                              alt={emp.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Camera className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-[#142D52] block">{emp.full_name}</span>
                          <span className="font-mono text-[11px] text-[#64748B]">ID: {emp.employee_id}</span>
                        </div>
                      </div>
                    </td>

                    {/* Factory & Dept */}
                    <td className="px-6 py-4">
                      <span className="font-semibold text-[#142D52] block">{emp.factory_name || "—"}</span>
                      <span className="text-[#64748B] text-[11px]">{emp.department_name || "—"}</span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          emp.has_face_enrolled
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {emp.has_face_enrolled ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Enrolled</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Pending Scan</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Samples Count */}
                    <td className="px-6 py-4">
                      <span
                        className={`font-semibold text-[11px] ${
                          emp.samples_count >= 5
                            ? "text-emerald-700"
                            : emp.samples_count > 0
                            ? "text-amber-700"
                            : "text-[#64748B]"
                        }`}
                      >
                        {emp.samples_count} / 5 Angles
                      </span>
                    </td>

                    {/* Enrolled Date */}
                    <td className="px-6 py-4 text-[#64748B] text-[11px]">
                      {emp.enrolled_at
                        ? new Date(emp.enrolled_at).toLocaleDateString()
                        : "—"}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {emp.has_face_enrolled && (
                          <button
                            onClick={() => setViewingEmp(emp)}
                            title="View 5-Angle Gallery"
                            className="p-1.5 text-[#64748B] hover:text-[#142D52] hover:bg-[#EAF0F8] rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => setEnrollingEmp(emp)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                            emp.has_face_enrolled
                              ? "bg-white border border-[#142D52]/20 text-[#142D52] hover:bg-[#EAF0F8]/50"
                              : "bg-[#142D52] text-white hover:bg-[#1e3a66] shadow-2xs"
                          }`}
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>{emp.has_face_enrolled ? "Re-scan" : "Enroll 5-Angles"}</span>
                        </button>

                        {emp.has_face_enrolled && (
                          <button
                            onClick={() => handleDeleteFace(emp)}
                            title="Delete Face Biometrics"
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* 5-Angle Webcam Enrollment Modal */}
      {enrollingEmp && (
        <FaceEnrollmentModal
          employeeId={enrollingEmp.id}
          employeeName={enrollingEmp.full_name}
          onEnrollmentComplete={() => {
            setEnrollingEmp(null);
            loadSummary();
            loadRoster();
          }}
          onCancel={() => setEnrollingEmp(null)}
        />
      )}

      {/* Enrolled Samples Gallery Modal */}
      {viewingEmp && (
        <FaceGalleryModal
          employeeId={viewingEmp.id}
          employeeName={viewingEmp.full_name}
          onClose={() => setViewingEmp(null)}
        />
      )}

      {/* 1:N Live Tester Drawer */}
      <FaceTesterDrawer
        isOpen={isTesterOpen}
        onClose={() => setIsTesterOpen(false)}
      />
    </div>
  );
}
