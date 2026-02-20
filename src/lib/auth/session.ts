import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { getUserProfile } from "@/lib/db/queries/users";
import type { SessionUser } from "@/types";

export async function getServerSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession();
  if (!session?.user) return null;

  const profile = await getUserProfile(session.user.id);
  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role as SessionUser["role"],
    allowedAgencies: profile.allowedAgencies ?? [],
  };
}
