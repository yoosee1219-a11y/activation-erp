"use client";

import { useSession } from "@/lib/auth/client";
import { useInitial } from "@/hooks/use-initial";

export function useAuth() {
  const { data: session, isPending } = useSession();
  // /api/initial 묶음 endpoint + SWR 캐싱 사용
  // useAgencyFilter와 같은 SWR key("/api/initial")이라 자동 dedup → 한 번만 fetch
  const { user, loading: initialLoading } = useInitial();

  // 세션 자체가 없으면 user는 null
  const finalUser = session?.user ? user : null;
  const loading = isPending || (session?.user && initialLoading);

  return { user: finalUser, loading: !!loading, session };
}
