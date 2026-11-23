"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  Upload,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { api } from "@/lib/api";
import { FaceSampleInput } from "@/types/api";

interface FaceEnrollmentProps {
  employeeId: string;
  employeeName: string;
  onEnrollmentComplete?: () => void;
  onCancel?: () => void;
}

type AngleStep = "center" | "left" | "right" | "top" | "bottom";

interface StepConfig {
  angle: AngleStep;
  label: string;
  instruction: string;
  tip: string;
}

const STEPS: StepConfig[] = [
  {
    angle: "center",
    label: "Step 1: Center",
    instruction: "Look straight into the camera",
    tip: "Keep head level and eyes open.",
  },
  {
    angle: "left",
    label: "Step 2: Turn Left",
    instruction: "Turn your head slightly to the left (~15°)",
    tip: "Keep your facial features clearly visible.",
  },
  {
    angle: "right",
    label: "Step 3: Turn Right",
    instruction: "Turn your head slightly to the right (~15°)",
    tip: "Keep shoulders forward, head tilted right.",
  },
  {
    angle: "top",
    label: "Step 4: Look Up",
    instruction: "Tilt your chin slightly upwards",
    tip: "Ensure your eyes remain directed toward the lens.",
  },
  {
    angle: "bottom",
    label: "Step 5: Look Down",
    instruction: "Tilt your chin slightly downwards",
    tip: "A subtle tilt down to capture forehead and brow.",
  },
];

export const FaceEnrollmentModal: React.FC<FaceEnrollmentProps> = ({
  employeeId,
  employeeName,
  onEnrollmentComplete,
  onCancel,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [capturedSamples, setCapturedSamples] = useState<{
    [key in AngleStep]?: string; // base64
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const currentStep = STEPS[currentStepIdx];
  const allCaptured = STEPS.every((s) => Boolean(capturedSamples[s.angle]));

  // Start webcam
  const startCamera = async () => {
    try {
      setCameraError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setCameraError("Camera access denied or device not found. You can also upload photos.");
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Capture from live video
  const captureCurrentAngle = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL("image/jpeg", 0.9);

    setCapturedSamples((prev) => ({
      ...prev,
      [currentStep.angle]: base64,
    }));

    // Auto advance to next uncaptured angle
    if (currentStepIdx < STEPS.length - 1) {
      setCurrentStepIdx((idx) => idx + 1);
    }
  };

  // Upload file fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setCapturedSamples((prev) => ({
        ...prev,
        [currentStep.angle]: base64,
      }));
      if (currentStepIdx < STEPS.length - 1) {
        setCurrentStepIdx((idx) => idx + 1);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const retakeSample = (angle: AngleStep) => {
    setCapturedSamples((prev) => {
      const next = { ...prev };
      delete next[angle];
      return next;
    });
    const targetIdx = STEPS.findIndex((s) => s.angle === angle);
    if (targetIdx !== -1) setCurrentStepIdx(targetIdx);
  };

  const handleSaveEnrollment = async () => {
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const payload: FaceSampleInput[] = STEPS.map((s, idx) => ({
        sample_index: idx + 1,
        angle: s.angle,
        image_base64: capturedSamples[s.angle] || "",
      })).filter((s) => Boolean(s.image_base64));

      if (payload.length < 5) {
        throw new Error("Please capture all 5 angles (Center, Left, Right, Top, Bottom) to complete enrollment.");
      }

      await api.enrollFaceBatch(employeeId, payload);
      setStatusMessage({
        type: "success",
        text: "5-angle facial biometric templates enrolled and compressed successfully!",
      });

      setTimeout(() => {
        stopCamera();
        if (onEnrollmentComplete) onEnrollmentComplete();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to enroll face samples on backend.";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-[#EAF0F8] flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#EAF0F8] flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAF0F8] flex items-center justify-center text-[#142D52]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#142D52]">5-Angle Face Biometrics Enrollment</h3>
              <p className="text-xs text-[#64748B]">Enrolling employee: <span className="font-semibold text-[#142D52]">{employeeName}</span></p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              if (onCancel) onCancel();
            }}
            className="p-2 text-[#64748B] hover:text-[#142D52] hover:bg-[#EAF0F8]/50 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                statusMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Steps Indicator */}
          <div className="grid grid-cols-5 gap-2">
            {STEPS.map((s, idx) => {
              const isCaptured = Boolean(capturedSamples[s.angle]);
              const isCurrent = currentStepIdx === idx;
              return (
                <button
                  key={s.angle}
                  onClick={() => setCurrentStepIdx(idx)}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    isCurrent
                      ? "border-[#142D52] bg-[#EAF0F8]/60 shadow-sm"
                      : isCaptured
                      ? "border-emerald-300 bg-emerald-50/50"
                      : "border-gray-200 bg-gray-50/50 opacity-70"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                      {s.angle}
                    </span>
                    {isCaptured && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <span className="text-xs font-semibold text-[#142D52] truncate">
                    {s.label.split(": ")[1]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Camera Viewport & Instruction */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Viewport */}
            <div className="md:col-span-2 relative aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-[#EAF0F8] flex items-center justify-center">
              {cameraError ? (
                <div className="p-6 text-center text-white/80 space-y-3">
                  <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-xs">{cameraError}</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-white text-[#142D52] rounded-lg text-xs font-semibold hover:bg-gray-100 transition shadow"
                  >
                    Upload Photo File Instead
                  </button>
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

                  {/* Face Alignment Oval Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-56 h-72 border-2 border-dashed border-white/60 rounded-[50%] shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                  </div>

                  {/* Current Angle Guide Badge */}
                  <div className="absolute top-3 left-3 bg-[#142D52]/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 shadow">
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{currentStep.instruction}</span>
                  </div>
                </>
              )}
            </div>

            {/* Sidebar Guide & Captured Angles Tray */}
            <div className="space-y-4 flex flex-col justify-between">
              <div className="bg-[#EAF0F8]/40 p-4 rounded-2xl border border-[#EAF0F8] space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#142D52]">
                  {currentStep.label}
                </span>
                <p className="text-sm font-semibold text-[#142D52]">
                  {currentStep.instruction}
                </p>
                <p className="text-xs text-[#64748B]">{currentStep.tip}</p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={captureCurrentAngle}
                  disabled={Boolean(cameraError)}
                  className="w-full py-3 bg-[#142D52] text-white rounded-xl text-xs font-semibold hover:bg-[#1e3a66] transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture Angle ({currentStep.angle.toUpperCase()})</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 bg-white border border-[#142D52]/20 text-[#142D52] rounded-xl text-xs font-semibold hover:bg-[#EAF0F8]/50 transition flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4 text-[#64748B]" />
                  <span>Upload File for this Angle</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Thumbnail Gallery of Captured Samples */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                  Captured Samples ({Object.keys(capturedSamples).length}/5)
                </span>
                <div className="grid grid-cols-5 gap-1.5">
                  {STEPS.map((s) => {
                    const sample = capturedSamples[s.angle];
                    return (
                      <div
                        key={s.angle}
                        className={`aspect-square rounded-lg border overflow-hidden relative group bg-gray-100 ${
                          sample ? "border-emerald-500" : "border-gray-200"
                        }`}
                      >
                        {sample ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={sample}
                              alt={s.angle}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => retakeSample(s.angle)}
                              title="Retake sample"
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 font-bold uppercase">
                            {s.angle[0]}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#EAF0F8] bg-gray-50 flex items-center justify-between">
          <button
            onClick={() => {
              stopCamera();
              if (onCancel) onCancel();
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-100 transition"
          >
            Cancel
          </button>

          <button
            onClick={handleSaveEnrollment}
            disabled={!allCaptured || isSubmitting}
            className={`px-6 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-sm ${
              allCaptured && !isSubmitting
                ? "bg-[#142D52] text-white hover:bg-[#1e3a66]"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing Biometric Vectors...</span>
              </>
            ) : (
              <>
                <span>Save 5-Angle Biometrics</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
