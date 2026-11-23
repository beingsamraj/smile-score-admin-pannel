"use client";

import React, { useState, useEffect } from "react";
import {
  Employee,
  EmployeeCreateInput,
  EmployeeUpdateInput,
  Factory,
  Department,
  HRAccount,
} from "@/types/api";
import { UserCheck, X, AlertCircle } from "lucide-react";

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EmployeeCreateInput | EmployeeUpdateInput) => Promise<void>;
  factories: Factory[];
  departments: Department[];
  hrAccounts: HRAccount[];
  employee?: Employee | null; // null if creating, populated if editing
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  factories,
  departments,
  hrAccounts,
  employee,
}) => {
  const isEdit = Boolean(employee);

  const [employeeId, setEmployeeId] = useState(employee?.employee_id || "");
  const [fullName, setFullName] = useState(employee?.full_name || "");
  const [factoryId, setFactoryId] = useState(employee?.factory_id || "");
  const [departmentId, setDepartmentId] = useState(employee?.department_id || "");
  const [assignedHrId, setAssignedHrId] = useState(employee?.assigned_hr_id || "");
  const [phone, setPhone] = useState(employee?.phone || "");
  const [email, setEmail] = useState(employee?.email || "");
  const [isActive, setIsActive] = useState(employee !== undefined ? employee?.is_active : true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active factories filter
  const selectableFactories = factories.filter((f) => f.is_active || (isEdit && f.id === employee?.factory_id));

  // Cascading departments: only departments belonging to chosen factory
  const selectableDepartments = departments.filter((d) => d.factory_id === factoryId && (d.is_active || (isEdit && d.id === employee?.department_id)));

  // Cascading HR accounts: only HR belonging to both chosen factory and department
  const selectableHRs = hrAccounts.filter(
    (h) => h.factory_id === factoryId && h.department_id === departmentId && (h.is_active || (isEdit && h.id === employee?.assigned_hr_id))
  );

  useEffect(() => {
    if (employee) {
      setEmployeeId(employee.employee_id);
      setFullName(employee.full_name);
      setFactoryId(employee.factory_id || "");
      setDepartmentId(employee.department_id || "");
      setAssignedHrId(employee.assigned_hr_id || "");
      setPhone(employee.phone || "");
      setEmail(employee.email || "");
      setIsActive(employee.is_active);
    } else {
      const initFac = selectableFactories[0]?.id || "";
      setFactoryId(initFac);
      const initDepts = departments.filter((d) => d.factory_id === initFac && d.is_active);
      const initDeptId = initDepts[0]?.id || "";
      setDepartmentId(initDeptId);
      const initHRs = hrAccounts.filter((h) => h.factory_id === initFac && h.department_id === initDeptId && h.is_active);
      setAssignedHrId(initHRs[0]?.id || "");
      setEmployeeId("");
      setFullName("");
      setPhone("");
      setEmail("");
      setIsActive(true);
    }
    setError(null);
  }, [employee, isOpen]);

  // When factory changes, reset department and HR
  const handleFactoryChange = (newFacId: string) => {
    setFactoryId(newFacId);
    const validDepts = departments.filter((d) => d.factory_id === newFacId && d.is_active);
    const newDeptId = validDepts[0]?.id || "";
    setDepartmentId(newDeptId);

    const validHRs = hrAccounts.filter((h) => h.factory_id === newFacId && h.department_id === newDeptId && h.is_active);
    setAssignedHrId(validHRs[0]?.id || "");
  };

  // When department changes, reset HR
  const handleDepartmentChange = (newDeptId: string) => {
    setDepartmentId(newDeptId);
    const validHRs = hrAccounts.filter((h) => h.factory_id === factoryId && h.department_id === newDeptId && h.is_active);
    setAssignedHrId(validHRs[0]?.id || "");
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate Employee ID on create
    if (!isEdit) {
      const cleanId = employeeId.trim();
      if (!cleanId) {
        setError("Employee ID is required.");
        return;
      }
      if (!/^\d+$/.test(cleanId)) {
        setError("Employee ID must contain only numeric digits (up to 16 digits).");
        return;
      }
      if (cleanId.length > 16) {
        setError(`Employee ID cannot exceed 16 digits (currently ${cleanId.length} digits).`);
        return;
      }
    }

    if (!fullName.trim()) {
      setError("Employee full name is required.");
      return;
    }
    if (!factoryId) {
      setError("Please select a factory.");
      return;
    }
    if (!departmentId) {
      setError("Please select a department belonging to the selected factory.");
      return;
    }
    if (!assignedHrId) {
      setError("Please select an assigned HR officer belonging to the selected department.");
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await onSubmit({
          full_name: fullName.trim(),
          factory_id: factoryId,
          department_id: departmentId,
          assigned_hr_id: assignedHrId,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          is_active: isActive,
        });
      } else {
        await onSubmit({
          employee_id: employeeId.trim(),
          full_name: fullName.trim(),
          factory_id: factoryId,
          department_id: departmentId,
          assigned_hr_id: assignedHrId,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          is_active: isActive,
        });
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save employee.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAF0F8] border border-[#D2E1F1] flex items-center justify-center text-[#142D52]">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#142D52]">
                {isEdit ? "Edit Employee Details" : "Register New Employee"}
              </h2>
              <p className="text-xs text-[#64748B]">
                {isEdit
                  ? "Update employee profile & organizational assignment"
                  : "Enter employee ID (up to 16 numeric digits) & assign hierarchy"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#142D52] hover:bg-[#EAF0F8] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1">
                Employee ID * {isEdit ? "(Immutable)" : "(Max 16 Digits)"}
              </label>
              <input
                type="text"
                required
                disabled={isEdit}
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value.replace(/\D/g, "").slice(0, 16))}
                placeholder="e.g. 000123456789"
                className={`w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl font-mono text-[#142D52] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52] ${
                  isEdit ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
                }`}
              />
              <span className="text-[10px] text-[#64748B] mt-0.5 block">
                {employeeId.length}/16 digits • Leading zeros preserved
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#142D52] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52]"
              />
            </div>
          </div>

          {/* Cascading Dropdowns: Factory -> Department -> Assigned HR */}
          <div className="p-4 bg-slate-50 border border-[#E2E8F0] rounded-xl space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#142D52] block">
              Organizational Hierarchy
            </span>

            {/* 1. Factory */}
            <div>
              <label className="block text-[11px] font-semibold text-[#142D52] mb-1">
                1. Select Factory *
              </label>
              <select
                required
                value={factoryId}
                onChange={(e) => handleFactoryChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#142D52] focus:outline-none focus:border-[#142D52]"
              >
                <option value="" disabled>-- Select Factory --</option>
                {selectableFactories.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.factory_code})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Department */}
            <div>
              <label className="block text-[11px] font-semibold text-[#142D52] mb-1">
                2. Select Department *
              </label>
              <select
                required
                value={departmentId}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                disabled={!factoryId || selectableDepartments.length === 0}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#142D52] focus:outline-none focus:border-[#142D52] disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="" disabled>
                  {selectableDepartments.length === 0 ? "No active departments in factory" : "-- Select Department --"}
                </option>
                {selectableDepartments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.department_code})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Assigned HR */}
            <div>
              <label className="block text-[11px] font-semibold text-[#142D52] mb-1">
                3. Assigned HR Officer *
              </label>
              <select
                required
                value={assignedHrId}
                onChange={(e) => setAssignedHrId(e.target.value)}
                disabled={!departmentId || selectableHRs.length === 0}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#142D52] focus:outline-none focus:border-[#142D52] disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="" disabled>
                  {selectableHRs.length === 0 ? "No active HR assigned to this department" : "-- Select Assigned HR --"}
                </option>
                {selectableHRs.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.full_name} (@{h.username})
                  </option>
                ))}
              </select>
              {departmentId && selectableHRs.length === 0 && (
                <p className="text-[11px] text-amber-600 mt-1">
                  Selected department has no HR officers assigned. Please assign an HR in HR Management first.
                </p>
              )}
            </div>
          </div>

          {/* Optional Contact Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1">
                Phone Number (Optional)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 012-3456"
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#142D52] focus:outline-none focus:border-[#142D52]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1">
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="employee@internal.com"
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#142D52] focus:outline-none focus:border-[#142D52]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="emp_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-[#142D52] focus:ring-[#142D52] border-[#E2E8F0]"
            />
            <label htmlFor="emp_active" className="text-xs font-medium text-[#142D52]">
              Employee is active & operational
            </label>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#142D52] hover:bg-[#EAF0F8] rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !factoryId || !departmentId || !assignedHrId}
              className="px-5 py-2 text-xs font-semibold bg-[#142D52] text-white hover:bg-[#0E203B] rounded-xl transition flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {loading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>{isEdit ? "Save Employee Changes" : "Register Employee"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
