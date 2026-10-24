"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AdminUser } from "@/types/api";
import { api } from "@/lib/api";

interface AuthContextType {
  user: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  logout: () => {},
  error: null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("admin_access_token");
    const storedUser = localStorage.getItem("admin_user");

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("admin_access_token");
        localStorage.removeItem("admin_user");
      }
    }
    setIsLoading(false);

    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
      setError("Session expired. Please log in again.");
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  const login = async (email: string, pass: string) => {
    setError(null);
    try {
      const resp = await api.login(email, pass);
      localStorage.setItem("admin_access_token", resp.access_token);
      localStorage.setItem("admin_user", JSON.stringify(resp.user));
      setToken(resp.access_token);
      setUser(resp.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem("admin_access_token");
    localStorage.removeItem("admin_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
