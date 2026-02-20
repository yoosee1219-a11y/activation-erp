"use client";

import { useSession } from "@/lib/auth/client";
import { useEffect, useState } from "react";
import type { SessionUser } from "@/types";

export function useAuth() {
  const { data: session, isPending } = useSession();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isPending) return;

    if (!session?.user) {
      setUser(null);
      setLoading(false);
      return;
    }

    fetch("/api/users/me")
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, [session, isPending]);

  return { user, loading, session };
}
