"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Smile,
  Building2,
  Network,
  UserCog,
  LogOut,
  Shield,
  Server,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LayoutDashboard,
} from "lucide-react";

interface AdminSidebarProps {
  backendStatus?: "online" | "offline" | "checking";
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ backendStatus = "online" }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      name: "Factories",
      href: "/factories",
      icon: Building2,
      badge: "Primary",
    },
    {
      name: "Departments",
      href: "/departments",
      icon: Network,
      badge: null,
    },
    {
      name: "HR Management",
      href: "/hr",
      icon: UserCog,
      badge: null,
    },
  ];

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const NavLinkContent = ({ item }: { item: typeof navItems[0] }) => {
    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition group ${
          isActive
            ? "bg-[#142D52] text-white shadow-xs"
            : "text-[#64748B] hover:text-[#142D52] hover:bg-[#EAF0F8]"
        }`}
        title={collapsed ? item.name : undefined}
      >
        <item.icon
          className={`w-4 h-4 flex-shrink-0 transition ${
            isActive ? "text-white" : "text-[#64748B] group-hover:text-[#142D52]"
          }`}
        />
        {!collapsed && (
          <div className="flex-1 flex items-center justify-between overflow-hidden">
            <span className="truncate">{item.name}</span>
            {item.badge && (
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-[#EAF0F8] text-[#142D52]"
                }`}
              >
                {item.badge}
              </span>
            )}
          </div>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Top Toggle */}
      <div className="lg:hidden bg-white border-b border-[#E2E8F0] px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#142D52] rounded-lg flex items-center justify-center text-white">
            <Smile className="w-5 h-5" />
          </div>
          <span className="font-bold text-sm text-[#142D52]">Smile Score Admin</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg text-[#142D52] hover:bg-[#EAF0F8] transition"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-xs"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 bottom-0 left-0 z-50 flex flex-col bg-white border-r border-[#E2E8F0] transition-all duration-200 h-screen ${
          collapsed ? "w-20" : "w-64"
        } ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-[#142D52] rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-xs">
              <Smile className="w-6 h-6" />
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-sm text-[#142D52] tracking-tight truncate leading-tight">
                  Smile Score
                </span>
                <span className="text-[11px] text-[#64748B] truncate">
                  Admin Panel
                </span>
              </div>
            )}
          </Link>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-[#64748B] hover:text-[#142D52] hover:bg-[#EAF0F8] transition"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8] px-3 mb-2">
            {!collapsed ? "Core Management" : "•••"}
          </div>
          {navItems.map((item) => (
            <NavLinkContent key={item.href} item={item} />
          ))}
        </nav>

        {/* System & User Footer */}
        <div className="p-3 border-t border-[#E2E8F0] space-y-2 bg-slate-50/50">
          {/* Backend Status indicator */}
          {!collapsed ? (
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#EAF0F8] border border-[#D2E1F1] rounded-lg text-xs text-[#142D52]">
              <div className="flex items-center gap-2 truncate">
                <Server
                  className={`w-3.5 h-3.5 flex-shrink-0 ${
                    backendStatus === "online" ? "text-emerald-600" : "text-amber-600"
                  }`}
                />
                <span className="font-medium text-[11px] truncate">FastAPI Service</span>
              </div>
              <span className="text-[10px] uppercase font-semibold text-emerald-700">Online</span>
            </div>
          ) : (
            <div
              className="flex justify-center p-2"
              title="FastAPI: Online"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          )}

          {/* User Profile Pill */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E2E8F0]">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-[#EAF0F8] border border-[#D2E1F1] flex items-center justify-center text-[#142D52] flex-shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              {!collapsed && (
                <div className="truncate">
                  <div className="text-xs font-semibold text-[#142D52] truncate">
                    {user?.name || "Administrator"}
                  </div>
                  <div className="text-[10px] text-[#64748B] capitalize truncate">
                    {user?.role || "Admin"}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 text-[#64748B] hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
