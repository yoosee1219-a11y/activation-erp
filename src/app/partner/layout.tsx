"use client";

import { useAuth } from "@/hooks/use-auth";
import { signOut } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Smartphone } from "lucide-react";

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (loading) {
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
        <div className="flex items-center gap-3">
          <Smartphone className="h-5 w-5 text-blue-600" />
          <span className="text-lg font-bold">Activation ERP</span>
          <Badge className="bg-blue-100 text-blue-800">거래처</Badge>
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
