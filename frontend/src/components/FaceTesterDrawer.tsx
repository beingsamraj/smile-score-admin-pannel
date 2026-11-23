"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  Scan,
  ShieldCheck,
  Building,
  UserCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { FaceIdentifyResult } from "@/types/api";

interface FaceTesterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FaceTesterDrawer: React.FC<FaceTesterDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [identifyResult, setIdentifyResult] = useState<FaceIdentifyResult | null>(null);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setCameraError("Camera access denied or device not found.");
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setIdentifyResult(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, stopCamera]);

  const handleScanAndIdentify = async () => {
    if (!videoRef.current) return;
    setIsScanning(true);
    setIdentifyResult(null);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not initialize canvas context");

      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL("image/jpeg", 0.9);

      const res = await api.identifyFace(base64, 0.62);
      setIdentifyResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to run face recognition query.";
      setIdentifyResult({
        is_identified: false,
        confidence_score: 0.0,
        confidence_percentage: 0.0,
        message: msg,
      });
    } finally {
      setIsScanning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-[#EAF0F8] animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EAF0F8] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EAF0F8] flex items-center justify-center text-[#142D52]">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#142D52]">Live Face Recognition Tester (1:N)</h3>
              <p className="text-xs text-[#64748B]">Simulate live biometric kiosk verification</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 text-[#64748B] hover:text-[#142D52] hover:bg-[#EAF0F8]/50 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Viewport */}
          <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-[#EAF0F8] flex items-center justify-center shadow-inner">
            {cameraError ? (
              <div className="p-6 text-center text-white/80 space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-xs">{cameraError}</p>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />

                {/* Scanning overlay box */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-52 h-64 border-2 border-emerald-400/80 rounded-2xl relative">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400" />
                  </div>
                </div>

                {isScanning && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2">
                    <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin" />
                    <span className="text-xs font-semibold">Comparing against biometric vectors...</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Trigger Scan Button */}
          <button
            onClick={handleScanAndIdentify}
            disabled={isScanning || Boolean(cameraError)}
            className="w-full py-3.5 bg-[#142D52] text-white rounded-xl text-xs font-semibold hover:bg-[#1e3a66] transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Scan className="w-4 h-4" />
            <span>Identify Person in Camera</span>
          </button>

          {/* Recognition Result Card */}
          {identifyResult && (
            <div
              className={`p-5 rounded-2xl border transition animate-in fade-in duration-200 ${
                identifyResult.is_identified
                  ? "bg-emerald-50/70 border-emerald-200"
                  : "bg-red-50/70 border-red-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    identifyResult.is_identified
                      ? "bg-emerald-600 text-white"
                      : "bg-red-600 text-white"
                  }`}
                >
                  {identifyResult.is_identified ? (
                    <UserCheck className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4
                      className={`text-sm font-bold ${
                        identifyResult.is_identified ? "text-emerald-950" : "text-red-950"
                      }`}
                    >
                      {identifyResult.is_identified
                        ? "Match Verified"
                        : "Identification Failed"}
                    </h4>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        identifyResult.is_identified
                          ? "bg-emerald-200 text-emerald-900"
                          : "bg-red-200 text-red-900"
                      }`}
                    >
                      {identifyResult.confidence_percentage}% Confidence
                    </span>
                  </div>

                  <p className="text-xs text-[#64748B]">{identifyResult.message}</p>

                  {identifyResult.is_identified && identifyResult.matched_employee && (
                    <div className="mt-3 pt-3 border-t border-emerald-200/60 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-[#64748B] uppercase font-bold block">
                          Employee
                        </span>
                        <span className="font-semibold text-[#142D52]">
                          {identifyResult.matched_employee.full_name}
                        </span>
                        <span className="block text-[11px] font-mono text-[#64748B]">
                          ID: {identifyResult.matched_employee.employee_id}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#64748B] uppercase font-bold block">
                          Facility / Dept
                        </span>
                        <span className="font-medium text-[#142D52] block">
                          {identifyResult.matched_employee.factory_name || "—"}
                        </span>
                        <span className="text-[11px] text-[#64748B]">
                          {identifyResult.matched_employee.department_name || "—"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
