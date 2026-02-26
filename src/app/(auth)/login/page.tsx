"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 이메일 형식이 아니면 자동 변환
      const loginEmail = email.includes("@")
        ? email
        : `${email}@activation-erp.local`;

      const result = await signIn.email({
        email: loginEmail,
        password,
      });

      if (result.error) {
        setError("아이디 또는 비밀번호가 올바르지 않습니다.");
      } else {
        // 역할 확인 후 리다이렉트 (user-role 쿠키도 이 호출에서 설정됨)
        const meRes = await fetch("/api/users/me");
        if (!meRes.ok) {
          // 역할 확인 실패 → 기본 대시보드로
          router.push("/");
          router.refresh();
          return;
        }
        const meData = await meRes.json();
        const role = meData.user?.role;

        if (role === "PARTNER" || role === "GUEST") {
          router.push("/partner");
        } else {
          router.push("/");
        }
        router.refresh();
      }
    } catch {
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-4">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Activation ERP</CardTitle>
        <CardDescription>통신 개통 관리 시스템</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">아이디</Label>
            <Input
              id="email"
              type="text"
              placeholder="4글자 이상"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              minLength={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={4}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
