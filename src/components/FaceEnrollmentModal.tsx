"use client";

import React, { useRef, useState, useEffect } from "react";
import { Camera, RefreshCw, CheckCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";

interface FaceEnrollmentProps {
  employeeId: string;
  employeeName: string;
  onEnrollmentComplete?: () => void;
  onCancel?: () => void;
}

export const FaceEnrollmentModal: React.FC<FaceEnrollmentProps> = ({
  employeeId,
  employeeName,
  onEnrollmentComplete,
  onCancel,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [samples, setSamples] = useState<Blob[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

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
      setCameraError("Camera access denied or device not found. Please verify permissions.");
    }
  };

  const stopCamera = React.useCallback(() => {
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

  const captureSample = () => {
    if (!videoRef.current || samples.length >= 3) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setSamples((prev) => [...prev, blob]);
          setPreviewUrls((prev) => [...prev, URL.createObjectURL(blob)]);
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const resetSamples = () => {
    setSamples([]);
    setPreviewUrls([]);
    setErrorStatus(null);
    setEnrollmentStatus(null);
  };

  const submitEnrollment = async () => {
    if (samples.length === 0) return;
    setIsSubmitting(true);
    setErrorStatus(null);
    try {
      const res = await api.enrollFaceSamples(employeeId, samples);
      setEnrollmentStatus(`Enrolled successfully! Processed ${res.samples_processed} sample(s).`);
      stopCamera();
      if (onEnrollmentComplete) {
        setTimeout(onEnrollmentComplete, 1500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to enroll face samples";
      setErrorStatus(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-xl w-full p-6 text-slate-900 dark:text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-500" />
              Face Enrollment
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Capturing biometric samples for <span className="font-semibold">{employeeName}</span> ({employeeId})
            </p>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onCancel?.();
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {cameraError ? (
            <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{cameraError}</span>
            </div>
          ) : (
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center border border-slate-700">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
              <div className="absolute inset-0 border-2 border-dashed border-indigo-400/50 pointer-events-none rounded-lg m-8 flex items-center justify-center">
                <span className="text-xs text-indigo-200/80 bg-black/40 px-2 py-1 rounded">
                  Center face in frame
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Captured Samples: {samples.length} / 3
            </span>
            <div className="flex gap-2">
              {previewUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Sample ${i + 1}`}
                  className="w-12 h-12 rounded object-cover border-2 border-indigo-500"
                />
              ))}
            </div>
          </div>

          {errorStatus && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorStatus}</span>
            </div>
          )}

          {enrollmentStatus && (
            <div className="p-3 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-lg text-xs text-green-600 dark:text-green-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{enrollmentStatus}</span>
            </div>
          )}

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span>
              Secure Biometric Protocol: Raw face photos are transmitted directly to the FastAPI server for verification and vectorization. No local embeddings are retained in browser storage.
            </span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={resetSamples}
            disabled={samples.length === 0 || isSubmitting}
            className="px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 disabled:opacity-40 flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" /> Reset
          </button>
          {samples.length < 3 ? (
            <button
              type="button"
              onClick={captureSample}
              disabled={!!cameraError}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              Capture Frame ({samples.length}/3)
            </button>
          ) : (
            <button
              type="button"
              onClick={submitEnrollment}
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? "Transmitting..." : "Send to FastAPI Backend"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
