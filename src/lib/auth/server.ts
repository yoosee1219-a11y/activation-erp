import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: (origin) => {
    // 로컬 개발
    if (origin === "http://localhost:3000" || origin === "http://localhost:3001") return true;
    // Vercel 모든 배포 URL (프로덕션 + 프리뷰)
    if (origin.endsWith(".vercel.app")) return true;
    // 환경변수에 설정된 URL
    if (process.env.NEXT_PUBLIC_APP_URL && origin === process.env.NEXT_PUBLIC_APP_URL) return true;
    return false;
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 4,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});

export type Session = typeof auth.$Infer.Session;
