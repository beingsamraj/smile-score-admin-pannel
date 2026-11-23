"use client";

import React, { useState, useEffect } from "react";
import {
  HRAccount,
  HRCreateInput,
  HRUpdateInput,
  Factory,
  Department,
} from "@/types/api";
import { UserCog, X, AlertCircle, Eye, EyeOff } from "lucide-react";

interface HRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: HRCreateInput | HRUpdateInput) => Promise<void>;
  factories: Factory[];
  departments: Department[]; // All departments (or we filter by selected factory)
  hrAccount?: HRAccount | null; // If editing
}

export const HRModal: React.FC<HRModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  factories,
  departments,
  hrAccount,
}) => {
  const isEdit = Boolean(hrAccount);

  const [factoryId, setFactoryId] = useState(hrAccount?.factory_id || "");
  const [departmentId, setDepartmentId] = useState(hrAccount?.department_id || "");
  const [fullName, setFullName] = useState(hrAccount?.full_name || "");
  const [username, setUsername] = useState(hrAccount?.username || "");
  const [email, setEmail] = useState(hrAccount?.email || "");
  const [phone, setPhone] = useState(hrAccount?.phone || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isActive, setIsActive] = useState(hrAccount !== undefined ? hrAccount?.is_active : true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available factories (active only unless editing and already assigned)
  const availableFactories = factories.filter(
    (f) => f.is_active || (isEdit && f.id === hrAccount?.factory_id)
  );

  // Dynamic Department list: filter only departments belonging to chosen factory
  const filteredDepartments = departments.filter((d) => d.factory_id === factoryId);

  // Reset or set form state on open / hrAccount change
  useEffect(() => {
    if (hrAccount) {
      setFactoryId(hrAccount.factory_id);
      setDepartmentId(hrAccount.department_id);
      setFullName(hrAccount.full_name);
      setUsername(hrAccount.username);
      setEmail(hrAccount.email);
      setPhone(hrAccount.phone);
      setIsActive(hrAccount.is_active);
      setPassword("");
      setConfirmPassword("");
    } else {
      const initialFacId = availableFactories[0]?.id || "";
      setFactoryId(initialFacId);
      const initialDepts = departments.filter((d) => d.factory_id === initialFacId);
      setDepartmentId(initialDepts[0]?.id || "");
      setFullName("");
      setUsername("");
      setEmail("");
      setPhone("");
      setPassword("");
      setConfirmPassword("");
      setIsActive(true);
    }
    setError(null);
  }, [hrAccount, isOpen]);

  // Dependent dropdown: When factory changes, reset department
  const handleFactoryChange = (newFacId: string) => {
    setFactoryId(newFacId);
    const validDepts = departments.filter((d) => d.factory_id === newFacId);
    setDepartmentId(validDepts[0]?.id || "");
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!factoryId) {
      setError("Please select a Factory.");
      return;
    }
    if (!departmentId) {
      setError("Please select a Department belonging to the chosen factory.");
      return;
    }
    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!username.trim()) {
      setError("Username is required.");
      return;
    }
    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }
    if (!phone.trim()) {
      setError("Contact phone number is required.");
      return;
    }

    if (!isEdit) {
      if (!password) {
        setError("A password is required for new HR account registration.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please re-enter.");
        return;
      }
    }

    setLoading(true);
    try {
      if (isEdit) {
        await onSubmit({
          factory_id: factoryId,
          department_id: departmentId,
          full_name: fullName.trim(),
          username: username.trim(),
          email: email.trim(),
          phone: phone.trim(),
          is_active: isActive,
        });
      } else {
        await onSubmit({
          factory_id: factoryId,
          department_id: departmentId,
          full_name: fullName.trim(),
          username: username.trim(),
          email: email.trim(),
          password,
          phone: phone.trim(),
          is_active: isActive,
        });
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save HR account.");
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
              <UserCog className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#142D52]">
                {isEdit ? "Edit HR Account" : "Register HR Officer"}
              </h2>
              <p className="text-xs text-[#64748B]">
                Assign plant-level Human Resources officer with department scope
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

          {/* Dynamic Factory and Department Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1">
                1. Select Factory *
              </label>
              <select
                required
                value={factoryId}
                onChange={(e) => handleFactoryChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#142D52] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52]"
              >
                <option value="" disabled>
                  -- Select Factory --
                </option>
                {availableFactories.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.factory_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1">
                2. Select Department *
              </label>
              <select
                required
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={!factoryId || filteredDepartments.length === 0}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#142D52] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52] disabled:bg-slate-50 disabled:cursor-not-allowed"
              >
                <option value="" disabled>
                  {filteredDepartments.length === 0 ? "No departments in factory" : "-- Select Department --"}
                </option>
                {filteredDepartments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.department_code})
                  </option>
                ))}
              </select>
              {factoryId && filteredDepartments.length === 0 && (
                <p className="text-[11px] text-amber-600 mt-1">
                  Selected factory has no departments. Add a department first.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1">
                HR Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Sarah Connor"
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#142D52] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1">
                Username * (Unique)
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. sarah_hr"
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#142D52] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1">
                Email Address * (Unique)
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah.hr@factory.com"
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#142D52] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (512) 555-8888"
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#142D52] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52]"
              />
            </div>
          </div>

          {/* Passwords (required only on create) */}
          {!isEdit && (
            <div className="p-4 bg-slate-50 border border-[#E2E8F0] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#142D52]">
                  HR Security Credentials
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-[#64748B] hover:text-[#142D52] flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? "Hide" : "Show"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#142D52] mb-1">
                    Password * (Min 6 chars)
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#142D52] focus:outline-none focus:border-[#142D52]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#142D52] mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#142D52] focus:outline-none focus:border-[#142D52]"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="hr_is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-[#142D52] focus:ring-[#142D52] border-[#E2E8F0]"
            />
            <label htmlFor="hr_is_active" className="text-xs font-medium text-[#142D52]">
              HR account is active (Inactive HR accounts are blocked from system access)
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
              disabled={loading || !factoryId || !departmentId}
              className="px-5 py-2 text-xs font-semibold bg-[#142D52] text-white hover:bg-[#0E203B] rounded-xl transition flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {loading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>{isEdit ? "Save HR Changes" : "Register HR Account"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
