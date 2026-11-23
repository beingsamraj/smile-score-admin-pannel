"use client";

import React, { useState, useEffect } from "react";
import { X, ShieldCheck, Calendar, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { FaceTemplate } from "@/types/api";

interface FaceGalleryModalProps {
  employeeId: string;
  employeeName: string;
  onClose: () => void;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export const FaceGalleryModal: React.FC<FaceGalleryModalProps> = ({
  employeeId,
  employeeName,
  onClose,
}) => {
  const [templates, setTemplates] = useState<FaceTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.getFaceTemplates(employeeId);
        setTemplates(res);
      } catch {
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [employeeId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-[#EAF0F8] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EAF0F8] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAF0F8] flex items-center justify-center text-[#142D52]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#142D52]">Enrolled 5-Angle Face Templates</h3>
              <p className="text-xs text-[#64748B]">Employee: <span className="font-semibold text-[#142D52]">{employeeName}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#64748B] hover:text-[#142D52] hover:bg-[#EAF0F8]/50 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <div className="w-6 h-6 border-2 border-[#EAF0F8] border-t-[#142D52] rounded-full animate-spin" />
              <p className="text-xs text-[#64748B]">Loading biometric templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#64748B]">
              No face templates found for this employee.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {templates.map((t) => {
                const imgUrl = `${API_BASE_URL}${t.thumbnail_url}`;
                return (
                  <div
                    key={t.id}
                    className="border border-[#EAF0F8] rounded-xl overflow-hidden bg-white shadow-xs flex flex-col"
                  >
                    <div className="aspect-square bg-gray-100 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgUrl}
                        alt={t.angle}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-[#142D52]/80 backdrop-blur-xs text-white text-[9px] font-bold uppercase rounded-md shadow">
                        {t.angle}
                      </span>
                    </div>

                    <div className="p-2.5 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-[#64748B]">
                        <span>Quality:</span>
                        <span className="font-semibold text-emerald-700">
                          {Math.round(t.quality_score * 100)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[#64748B]">
                        <span>Sample:</span>
                        <span className="font-mono font-medium text-[#142D52]">#{t.sample_index}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#EAF0F8] bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#142D52] text-white rounded-xl text-xs font-semibold hover:bg-[#1e3a66] transition shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
