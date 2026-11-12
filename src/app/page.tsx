"use client";

import Link from "next/link";
import { Smile, ShieldCheck, Users, Activity, ArrowRight, Lock } from "lucide-react";

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-white text-[#142D52] flex flex-col justify-between">
      {/* Navigation bar */}
      <header className="w-full border-b border-[#E2E8F0] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#142D52] rounded-xl flex items-center justify-center text-white shadow-xs">
            <Smile className="w-6 h-6" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight leading-none block text-[#142D52]">
              Smile Score
            </span>
            <span className="text-xs text-[#64748B] mt-0.5 block">
              Enterprise Biometrics & Monitoring
            </span>
          </div>
        </div>

        <Link
          href="/login"
          className="px-4 py-2 bg-[#142D52] hover:bg-[#0E203B] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Admin Login</span>
        </Link>
      </header>

      {/* Main Hero Banner */}
      <main className="max-w-4xl mx-auto px-6 py-16 text-center space-y-8 my-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#EAF0F8] border border-[#D2E1F1] rounded-full text-xs font-semibold text-[#142D52]">
          <ShieldCheck className="w-4 h-4 text-[#142D52]" />
          <span>Secure Administrator Management System</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#142D52] leading-tight">
          Workforce Emotion Monitoring & Biometric Administration
        </h1>

        <p className="text-base sm:text-lg text-[#64748B] max-w-2xl mx-auto leading-relaxed">
          Centralized administrative management platform to register employees, manage biometric face enrollments, track workplace satisfaction scores, and review real-time recognition analytics.
        </p>

        {/* Action Button */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 bg-[#142D52] hover:bg-[#0E203B] text-white font-semibold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
          >
            <span>Proceed to Admin Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="pt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="p-6 bg-[#EAF0F8]/50 border border-[#D2E1F1] rounded-2xl">
            <Users className="w-6 h-6 text-[#142D52] mb-3" />
            <h3 className="text-sm font-bold text-[#142D52] mb-1">Employee Directory</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Register, update, and manage employee profiles across all active departments and workstations.
            </p>
          </div>

          <div className="p-6 bg-[#EAF0F8]/50 border border-[#D2E1F1] rounded-2xl">
            <ShieldCheck className="w-6 h-6 text-[#142D52] mb-3" />
            <h3 className="text-sm font-bold text-[#142D52] mb-1">Biometric Enrollment</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Capture multi-sample face scans and securely vectorize employee templates on the FastAPI backend.
            </p>
          </div>

          <div className="p-6 bg-[#EAF0F8]/50 border border-[#D2E1F1] rounded-2xl">
            <Activity className="w-6 h-6 text-[#142D52] mb-3" />
            <h3 className="text-sm font-bold text-[#142D52] mb-1">Smile Score Analytics</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Inspect real-time smile detection verification logs, confidence ratings, and trend analytics.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#E2E8F0] px-6 py-6 text-center text-xs text-[#64748B]">
        Smile Score Recognition & Biometric Management System • Admin Panel
      </footer>
    </div>
  );
}
