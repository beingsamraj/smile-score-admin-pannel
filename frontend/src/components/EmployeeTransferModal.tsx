"use client";

import React, { useState, useEffect } from "react";
import {
  Employee,
  Factory,
  Department,
  HRAccount,
  DepartmentTransferInput,
  FactoryTransferInput,
} from "@/types/api";
import { ArrowLeftRight, AlertCircle, X } from "lucide-react";

interface EmployeeTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  factories: Factory[];
  departments: Department[];
  hrAccounts: HRAccount[];
  onDepartmentTransfer: (empId: string, data: DepartmentTransferInput) => Promise<void>;
  onFactoryTransfer: (empId: string, data: FactoryTransferInput) => Promise<void>;
}

export const EmployeeTransferModal: React.FC<EmployeeTransferModalProps> = ({
  isOpen,
  onClose,
  employee,
  factories,
  departments,
  hrAccounts,
  onDepartmentTransfer,
  onFactoryTransfer,
}) => {
  const [transferType, setTransferType] = useState<"department" | "factory">("department");

  // Selection states
  const [targetFactoryId, setTargetFactoryId] = useState("");
  const [targetDepartmentId, setTargetDepartmentId] = useState("");
  const [newAssignedHrId, setNewAssignedHrId] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize and reset selections when opened
  useEffect(() => {
    if (employee) {
      if (transferType === "department") {
        setTargetFactoryId(employee.factory_id || "");
        const deptsInFac = departments.filter(
          (d) => d.factory_id === employee.factory_id && d.id !== employee.department_id && d.is_active
        );
        const initDeptId = deptsInFac[0]?.id || "";
        setTargetDepartmentId(initDeptId);

        const hrsInDept = hrAccounts.filter(
          (h) => h.factory_id === employee.factory_id && h.department_id === initDeptId && h.is_active
        );
        setNewAssignedHrId(hrsInDept[0]?.id || "");
      } else {
        // Factory transfer
        const otherFactories = factories.filter((f) => f.id !== employee.factory_id && f.is_active);
        const initFacId = otherFactories[0]?.id || "";
        setTargetFactoryId(initFacId);

        const deptsInNewFac = departments.filter((d) => d.factory_id === initFacId && d.is_active);
        const initDeptId = deptsInNewFac[0]?.id || "";
        setTargetDepartmentId(initDeptId);

        const hrsInNewDept = hrAccounts.filter(
          (h) => h.factory_id === initFacId && h.department_id === initDeptId && h.is_active
        );
        setNewAssignedHrId(hrsInNewDept[0]?.id || "");
      }
      setReason("");
    }
    setError(null);
  }, [employee, transferType, isOpen]);

  if (!isOpen || !employee) return null;

  // Available options
  const otherFactories = factories.filter((f) => f.id !== employee.factory_id && f.is_active);

  const availableDepartments = departments.filter(
    (d) =>
      d.factory_id === targetFactoryId &&
      (transferType === "factory" || d.id !== employee.department_id) &&
      d.is_active
  );

  const availableHRs = hrAccounts.filter(
    (h) => h.factory_id === targetFactoryId && h.department_id === targetDepartmentId && h.is_active
  );

  const handleTargetFactoryChange = (facId: string) => {
    setTargetFactoryId(facId);
    const validDepts = departments.filter((d) => d.factory_id === facId && d.is_active);
    const initDeptId = validDepts[0]?.id || "";
    setTargetDepartmentId(initDeptId);

    const validHRs = hrAccounts.filter((h) => h.factory_id === facId && h.department_id === initDeptId && h.is_active);
    setNewAssignedHrId(validHRs[0]?.id || "");
  };

  const handleTargetDepartmentChange = (deptId: string) => {
    setTargetDepartmentId(deptId);
    const validHRs = hrAccounts.filter((h) => h.factory_id === targetFactoryId && h.department_id === deptId && h.is_active);
    setNewAssignedHrId(validHRs[0]?.id || "");
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (transferType === "department") {
      if (!targetDepartmentId) {
        setError("Please choose a target department in the current factory.");
        return;
      }
      if (!newAssignedHrId) {
        setError("Please assign a new HR officer in the target department.");
        return;
      }

      setLoading(true);
      try {
        await onDepartmentTransfer(employee.id, {
          target_department_id: targetDepartmentId,
          new_assigned_hr_id: newAssignedHrId,
          reason: reason.trim() || undefined,
        });
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Department transfer failed.");
      } finally {
        setLoading(false);
      }
    } else {
      // Factory transfer
      if (!targetFactoryId) {
        setError("Please select a target destination factory.");
        return;
      }
      if (!targetDepartmentId) {
        setError("Please select a target department in the destination factory.");
        return;
      }
      if (!newAssignedHrId) {
        setError("Please select an assigned HR officer in the destination department.");
        return;
      }

      setLoading(true);
      try {
        await onFactoryTransfer(employee.id, {
          target_factory_id: targetFactoryId,
          target_department_id: targetDepartmentId,
          new_assigned_hr_id: newAssignedHrId,
          reason: reason.trim() || undefined,
        });
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Factory transfer failed.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAF0F8] border border-[#D2E1F1] flex items-center justify-center text-[#142D52]">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#142D52]">
                Transfer Employee Assignment
              </h2>
              <p className="text-xs text-[#64748B]">
                Reassign employee between departments or across factory plant sites
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

        {/* Transfer Mode Tabs */}
        <div className="flex border-b border-[#E2E8F0] bg-slate-50/50 p-2 gap-2">
          <button
            type="button"
            onClick={() => setTransferType("department")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              transferType === "department"
                ? "bg-white text-[#142D52] shadow-2xs border border-[#E2E8F0]"
                : "text-[#64748B] hover:text-[#142D52]"
            }`}
          >
            A. Department Transfer (Same Factory)
          </button>
          <button
            type="button"
            onClick={() => setTransferType("factory")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              transferType === "factory"
                ? "bg-white text-[#142D52] shadow-2xs border border-[#E2E8F0]"
                : "text-[#64748B] hover:text-[#142D52]"
            }`}
          >
            B. Factory Transfer (Plant Relocation)
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleExecuteTransfer} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Assignment Overview */}
          <div className="p-4 rounded-xl border border-[#E2E8F0] bg-slate-50 space-y-2 text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#142D52] block">
              Current Assignment
            </span>
            <div className="grid grid-cols-2 gap-2 text-[#64748B]">
              <div>
                <span className="font-semibold text-[#142D52]">Employee:</span> {employee.full_name}
              </div>
              <div>
                <span className="font-semibold text-[#142D52]">ID:</span> <span className="font-mono">{employee.employee_id}</span>
              </div>
              <div>
                <span className="font-semibold text-[#142D52]">Current Plant:</span> {employee.factory_name} ({employee.factory_code})
              </div>
              <div>
                <span className="font-semibold text-[#142D52]">Current Dept:</span> {employee.department_name} ({employee.department_code})
              </div>
              <div className="col-span-2">
                <span className="font-semibold text-[#142D52]">Current HR:</span> {employee.assigned_hr_name} (@{employee.assigned_hr_username})
              </div>
            </div>
          </div>

          {/* Transfer Inputs */}
          {transferType === "department" ? (
            <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#142D52] block">
                Target Department In {employee.factory_name}
              </span>

              <div>
                <label className="block text-[11px] font-semibold text-[#142D52] mb-1">
                  1. Target Department *
                </label>
                <select
                  required
                  value={targetDepartmentId}
                  onChange={(e) => handleTargetDepartmentChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#142D52] focus:outline-none focus:border-[#142D52]"
                >
                  <option value="" disabled>-- Select New Department --</option>
                  {availableDepartments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.department_code})
                    </option>
                  ))}
                </select>
                {availableDepartments.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    No other active departments exist in this factory to transfer into.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#142D52] mb-1">
                  2. New Assigned HR *
                </label>
                <select
                  required
                  value={newAssignedHrId}
                  onChange={(e) => setNewAssignedHrId(e.target.value)}
                  disabled={!targetDepartmentId || availableHRs.length === 0}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#142D52] focus:outline-none focus:border-[#142D52] disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="" disabled>-- Select New HR --</option>
                  {availableHRs.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.full_name} (@{h.username})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#142D52] block">
                Destination Factory & Hierarchy
              </span>

              <div>
                <label className="block text-[11px] font-semibold text-[#142D52] mb-1">
                  1. Destination Factory *
                </label>
                <select
                  required
                  value={targetFactoryId}
                  onChange={(e) => handleTargetFactoryChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#142D52] focus:outline-none focus:border-[#142D52]"
                >
                  <option value="" disabled>-- Select Destination Plant --</option>
                  {otherFactories.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.factory_code}) - {f.city}
                    </option>
                  ))}
                </select>
                {otherFactories.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    No other active factories available for plant transfer.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#142D52] mb-1">
                  2. Target Department in Destination *
                </label>
                <select
                  required
                  value={targetDepartmentId}
                  onChange={(e) => handleTargetDepartmentChange(e.target.value)}
                  disabled={!targetFactoryId || availableDepartments.length === 0}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#142D52] focus:outline-none focus:border-[#142D52] disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="" disabled>-- Select Department --</option>
                  {availableDepartments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.department_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#142D52] mb-1">
                  3. Assigned HR Officer in Destination *
                </label>
                <select
                  required
                  value={newAssignedHrId}
                  onChange={(e) => setNewAssignedHrId(e.target.value)}
                  disabled={!targetDepartmentId || availableHRs.length === 0}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#142D52] focus:outline-none focus:border-[#142D52] disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="" disabled>-- Select HR --</option>
                  {availableHRs.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.full_name} (@{h.username})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Transfer Reason */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1">
              Transfer Reason (Recorded to History)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Work allocation adjustment, plant relocation, promotion..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#142D52] focus:outline-none focus:border-[#142D52]"
            />
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
              disabled={loading || !targetDepartmentId || !newAssignedHrId}
              className="px-5 py-2 text-xs font-semibold bg-[#142D52] text-white hover:bg-[#0E203B] rounded-xl transition flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {loading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>
                {transferType === "department" ? "Execute Department Transfer" : "Execute Factory Transfer"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
