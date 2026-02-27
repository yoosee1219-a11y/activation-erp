"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Smartphone,
  Users,
  Building2,
  Settings,
  LogOut,
  FileSpreadsheet,
  CardSim,
} from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/types";

interface SidebarProps {
  user: SessionUser | null;
}

const mainNavItems = [
  {
    label: "대시보드",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "개통 관리",
    href: "/activations",
    icon: Smartphone,
  },
  {
    label: "가져오기/내보내기",
    href: "/import",
    icon: FileSpreadsheet,
  },
];

const adminNavItems = [
  {
    label: "유심 관리",
    href: "/admin/usims",
    icon: CardSim,
  },
  {
    label: "사용자 관리",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "거래처 관리",
    href: "/admin/agencies",
    icon: Building2,
  },
  {
    label: "설정",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUB_ADMIN";

  const handleLogout = async () => {
    await signOut();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-lg font-bold">Activation ERP</h1>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        <div className="mb-2 px-3 text-xs font-semibold uppercase text-gray-400">
          메인
        </div>
        {mainNavItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="mb-2 mt-6 px-3 text-xs font-semibold uppercase text-gray-400">
              관리
            </div>
            {adminNavItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="border-t p-4">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs text-gray-500">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
