"use client";

import React, { useState, useEffect } from "react";
import { Department, DepartmentCreateInput, DepartmentUpdateInput, Factory } from "@/types/api";
import { Network, X, AlertCircle } from "lucide-react";

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DepartmentCreateInput | DepartmentUpdateInput) => Promise<void>;
  factories: Factory[];
  department?: Department | null;
  defaultFactoryId?: string;
}

export const DepartmentModal: React.FC<DepartmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  factories,
  department,
  defaultFactoryId,
}) => {
  const isEdit = Boolean(department);

  const [formData, setFormData] = useState({
    factory_id: department?.factory_id || defaultFactoryId || "",
    name: department?.name || "",
    department_code: department?.department_code || "",
    description: department?.description || "",
    is_active: department !== undefined ? department?.is_active : true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter only active factories for new creation, but include current if editing
  const selectableFactories = factories.filter(
    (f) => f.is_active || (isEdit && f.id === department?.factory_id)
  );

  useEffect(() => {
    if (department) {
      setFormData({
        factory_id: department.factory_id,
        name: department.name,
        department_code: department.department_code,
        description: department.description || "",
        is_active: department.is_active,
      });
    } else {
      setFormData({
        factory_id: defaultFactoryId || (selectableFactories[0]?.id || ""),
        name: "",
        department_code: "",
        description: "",
        is_active: true,
      });
    }
    setError(null);
  }, [department, defaultFactoryId, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.factory_id) {
      setError("Please select an active Factory.");
      return;
    }
    if (!formData.name.trim()) {
      setError("Department name is required.");
      return;
    }
    if (!formData.department_code.trim()) {
      setError("Department code is required.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save department.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-lg w-full flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAF0F8] border border-[#D2E1F1] flex items-center justify-center text-[#142D52]">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#142D52]">
                {isEdit ? "Edit Department" : "Add Department to Factory"}
              </h2>
              <p className="text-xs text-[#64748B]">
                Departments partition plant operations and assign HR personnel
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Factory Selection (Must select active factory) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1">
              Select Factory *
            </label>
            <select
              required
              value={formData.factory_id}
              onChange={(e) => setFormData({ ...formData, factory_id: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#142D52] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52]"
            >
              <option value="" disabled>
                -- Choose an Active Factory --
              </option>
              {selectableFactories.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.name} ({fac.factory_code}) - {fac.city}
                </option>
              ))}
            </select>
            {selectableFactories.length === 0 && (
              <p className="text-[11px] text-amber-600 mt-1">
                No active factories available. Please create or activate a factory first.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1">
                Department Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Quality Assurance"
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#142D52] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1">
                Department Code *
              </label>
              <input
                type="text"
                required
                value={formData.department_code}
                onChange={(e) => setFormData({ ...formData, department_code: e.target.value })}
                placeholder="e.g. QA-01"
                className="w-full px-3.5 py-2 text-sm uppercase bg-white border border-[#E2E8F0] rounded-xl text-[#142D52] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Overview of department duties & responsibilities..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#142D52] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52]"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="dept_is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded text-[#142D52] focus:ring-[#142D52] border-[#E2E8F0]"
            />
            <label htmlFor="dept_is_active" className="text-xs font-medium text-[#142D52]">
              Department is active & operational
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
              disabled={loading || selectableFactories.length === 0}
              className="px-5 py-2 text-xs font-semibold bg-[#142D52] text-white hover:bg-[#0E203B] rounded-xl transition flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {loading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>{isEdit ? "Save Changes" : "Create Department"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
