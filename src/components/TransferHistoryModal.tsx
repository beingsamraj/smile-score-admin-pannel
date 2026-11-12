"use client";

import React, { useState, useEffect } from "react";
import { Employee, TransferHistory } from "@/types/api";
import { api } from "@/lib/api";
import { History, X, Building2, Network, UserCog } from "lucide-react";

interface TransferHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

export const TransferHistoryModal: React.FC<TransferHistoryModalProps> = ({
  isOpen,
  onClose,
  employee,
}) => {
  const [history, setHistory] = useState<TransferHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && employee) {
      setLoading(true);
      api
        .getTransferHistory(employee.id)
        .then((data) => setHistory(data))
        .catch(() => setHistory([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen, employee]);

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAF0F8] border border-[#D2E1F1] flex items-center justify-center text-[#142D52]">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#142D52]">Transfer Audit History</h2>
              <p className="text-xs text-[#64748B]">
                {employee.full_name} (ID: {employee.employee_id})
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

        {/* List Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-[#64748B]">
              <div className="w-6 h-6 border-2 border-[#142D52]/20 border-t-[#142D52] rounded-full animate-spin mx-auto mb-2" />
              Loading historical transfer logs...
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#64748B] border border-dashed border-[#E2E8F0] rounded-xl">
              No historical transfers recorded for this employee.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="p-4 rounded-xl border border-[#E2E8F0] bg-white shadow-2xs space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        record.transfer_type === "factory"
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {record.transfer_type === "factory" ? "Factory Transfer" : "Department Transfer"}
                    </span>
                    <span className="text-[11px] text-[#64748B]">
                      {new Date(record.transfer_date).toLocaleString()}
                    </span>
                  </div>

                  {/* Transition display */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div className="p-2.5 bg-slate-50 rounded-lg space-y-1">
                      <div className="text-[10px] uppercase font-semibold text-[#64748B]">Previous Assignment</div>
                      <div className="font-medium text-[#142D52] flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#64748B]" />
                        <span>{record.previous_factory_name || "Unassigned"}</span>
                      </div>
                      <div className="text-[11px] text-[#64748B] flex items-center gap-1.5">
                        <Network className="w-3.5 h-3.5" />
                        <span>{record.previous_department_name || "Unassigned"}</span>
                      </div>
                      <div className="text-[11px] text-[#64748B] flex items-center gap-1.5">
                        <UserCog className="w-3.5 h-3.5" />
                        <span>HR: {record.previous_hr_name || "None"}</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-lg space-y-1">
                      <div className="text-[10px] uppercase font-semibold text-emerald-800">New Assignment</div>
                      <div className="font-medium text-emerald-950 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{record.new_factory_name}</span>
                      </div>
                      <div className="text-[11px] text-emerald-800 flex items-center gap-1.5">
                        <Network className="w-3.5 h-3.5" />
                        <span>{record.new_department_name}</span>
                      </div>
                      <div className="text-[11px] text-emerald-800 flex items-center gap-1.5">
                        <UserCog className="w-3.5 h-3.5" />
                        <span>HR: {record.new_hr_name}</span>
                      </div>
                    </div>
                  </div>

                  {record.reason && (
                    <div className="text-[11px] text-[#64748B] pt-1">
                      <span className="font-semibold text-[#142D52]">Reason:</span> {record.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E2E8F0] bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-[#142D52] text-white rounded-xl hover:bg-[#0E203B] transition"
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  );
};
