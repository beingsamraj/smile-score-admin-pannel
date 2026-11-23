"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, token, isLoading, login, error } = useAuth();
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // If already authenticated with valid JWT, redirect straight to dashboard
  useEffect(() => {
    if (!isLoading && token && user) {
      router.replace("/dashboard");
    }
  }, [isLoading, token, user, router]);

  const handleLogin = async (identifier: string, pass: string) => {
    setLoginSubmitting(true);
    try {
      await login(identifier, pass);
      router.push("/dashboard");
    } finally {
      setLoginSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#142D52] flex flex-col justify-between p-6">
      <div className="w-full max-w-md mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#142D52] transition mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="w-full flex items-center justify-center">
        <AdminLoginForm
          onLogin={handleLogin}
          isLoading={loginSubmitting}
          serverError={error}
        />
      </div>

      <div className="text-center text-xs text-[#94A3B8] py-4">
        Smile Score Admin Authentication
      </div>
    </div>
  );
}
