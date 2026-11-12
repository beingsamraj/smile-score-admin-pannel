"use client";

import React, { useState } from "react";
import { Factory, FactoryCreateInput, FactoryUpdateInput } from "@/types/api";
import { Building2, X, AlertCircle } from "lucide-react";

interface FactoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FactoryCreateInput | FactoryUpdateInput) => Promise<void>;
  factory?: Factory | null; // If editing
}

export const FactoryModal: React.FC<FactoryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  factory,
}) => {
  const isEdit = Boolean(factory);

  const [formData, setFormData] = useState({
    name: factory?.name || "",
    factory_code: factory?.factory_code || "",
    address: factory?.address || "",
    city: factory?.city || "",
    state: factory?.state || "",
    country: factory?.country || "USA",
    phone: factory?.phone || "",
    email: factory?.email || "",
    description: factory?.description || "",
    is_active: factory !== undefined ? factory?.is_active : true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state if editing factory changes
  React.useEffect(() => {
    if (factory) {
      setFormData({
        name: factory.name,
        factory_code: factory.factory_code,
        address: factory.address,
        city: factory.city,
        state: factory.state,
        country: factory.country,
        phone: factory.phone,
        email: factory.email,
        description: factory.description || "",
        is_active: factory.is_active,
      });
    } else {
      setFormData({
        name: "",
        factory_code: "",
        address: "",
        city: "",
        state: "",
        country: "USA",
        phone: "",
        email: "",
        description: "",
        is_active: true,
      });
    }
    setError(null);
  }, [factory, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Factory name is required.");
      return;
    }
    if (!formData.factory_code.trim()) {
      setError("Unique Factory code is required.");
      return;
    }
    if (!formData.email.trim()) {
      setError("Contact email address is required.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save factory.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAF0F8] border border-[#D2E1F1] flex items-center justify-center text-[#142D52]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#142D52]">
                {isEdit ? "Edit Factory Details" : "Register New Factory"}
              </h2>
              <p className="text-xs text-[#64748B]">
                {isEdit ? "Update plant locations and operational contact info" : "Enter primary factory credentials and address details"}
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
                Factory Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Apex Austin Assembly Plant"
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#142D52] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1">
                Factory Code * (Unique)
              </label>
              <input
                type="text"
                required
                value={formData.factory_code}
                onChange={(e) => setFormData({ ...formData, factory_code: e.target.value })}
                placeholder="e.g. FAC-TX-01"
                className="w-full px-3.5 py-2 text-sm uppercase bg-white border border-[#E2E8F0] rounded-xl text-[#142D52] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1">
              Physical Address *
            </label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. 100 Industrial Parkway, Suite 400"
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#142D52] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1">
                City *
              </label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Austin"
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#142D52] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1">
                State / Province *
              </label>
              <input
                type="text"
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="Texas"
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#142D52] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1">
                Country *
              </label>
              <input
                type="text"
                required
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="USA"
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#142D52] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1">
                Contact Phone *
              </label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (512) 555-0199"
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#142D52] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1">
                Contact Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="operations@factory.internal"
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#142D52] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52]"
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
              placeholder="High volume automotive and sensor assembly plant..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#142D52] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52]"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="fac_is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded text-[#142D52] focus:ring-[#142D52] border-[#E2E8F0]"
            />
            <label htmlFor="fac_is_active" className="text-xs font-medium text-[#142D52]">
              Factory is operational & active
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
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold bg-[#142D52] text-white hover:bg-[#0E203B] rounded-xl transition flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {loading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>{isEdit ? "Save Changes" : "Create Factory"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
