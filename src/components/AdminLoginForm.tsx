"use client";

import React, { useState } from "react";
import { Smile, Lock, User, Eye, EyeOff, AlertCircle, ArrowRight } from "lucide-react";

interface AdminLoginFormProps {
  onLogin: (identifier: string, pass: string) => Promise<void>;
  isLoading: boolean;
  serverError: string | null;
}

export const AdminLoginForm: React.FC<AdminLoginFormProps> = ({
  onLogin,
  isLoading,
  serverError,
}) => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      setValidationError("Please enter your admin username or email address.");
      return;
    }

    if (!password) {
      setValidationError("Please enter your administrator password.");
      return;
    }

    try {
      await onLogin(trimmedIdentifier, password);
    } catch {
      // Server error is handled in parent/context
    }
  };

  return (
    <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-2xl shadow-xl p-8 sm:p-10 transition-all">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-14 h-14 bg-[#EAF0F8] border border-[#D2E1F1] rounded-2xl flex items-center justify-center mb-4 text-[#142D52] shadow-xs">
          <Smile className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-[#142D52] tracking-tight">
          Admin Portal Login
        </h1>
        <p className="text-sm text-[#64748B] mt-1.5 font-normal">
          Smile Score Biometrics & Management
        </p>
      </div>

      {/* Error Alert */}
      {(validationError || serverError) && (
        <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2.5 leading-relaxed animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
          <span>{validationError || serverError}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Username / Email Field */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1.5">
            Admin Identifier
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              name="identifier"
              autoComplete="username"
              required
              disabled={isLoading}
              placeholder="Username or Email"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (validationError) setValidationError(null);
              }}
              className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm text-[#142D52] placeholder-[#94A3B8] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52] transition disabled:bg-slate-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#142D52] mb-1.5">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              required
              disabled={isLoading}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (validationError) setValidationError(null);
              }}
              className="w-full pl-10 pr-11 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm text-[#142D52] placeholder-[#94A3B8] focus:outline-none focus:border-[#142D52] focus:ring-1 focus:ring-[#142D52] transition disabled:bg-slate-50 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#64748B] hover:text-[#142D52] transition focus:outline-none cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 py-3 px-4 bg-[#142D52] hover:bg-[#0E203B] text-white text-sm font-semibold rounded-xl shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign In to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
