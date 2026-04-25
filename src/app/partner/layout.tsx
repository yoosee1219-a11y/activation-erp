"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { signOut } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Smartphone, Megaphone } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // ADMIN/SUB_ADMIN이 /partner에 진입하면 어드민 대시보드로 보냄
  useEffect(() => {
    if (!loading && user && (user.role === "ADMIN" || user.role === "SUB_ADMIN")) {
      router.replace("/");
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await signOut();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (loading || (user && (user.role === "ADMIN" || user.role === "SUB_ADMIN"))) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* 심플 상단 바 */}
      <header className="flex h-14 items-center justify-between border-b bg-white px-6 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <a href="/partner" className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-blue-600" />
              <span className="text-lg font-bold">NBKOREA 고객관리 프로그램</span>
            </a>
            <Badge className="bg-blue-100 text-blue-800">거래처</Badge>
          </div>
          <nav className="flex items-center gap-1">
            <Link
              href="/partner"
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                pathname === "/partner"
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              개통 관리
            </Link>
            <Link
              href="/partner/notices"
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
                pathname === "/partner/notices"
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Megaphone className="h-3.5 w-3.5" />
              공지사항
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{user?.name}</span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="mr-1 h-4 w-4" />
            로그아웃
          </Button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-auto bg-gray-50 p-6">
        {children}
      </main>
    </div>
  );
}
