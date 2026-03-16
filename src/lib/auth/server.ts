import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: (request) => {
    const origins = [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
    ];
    if (process.env.NEXT_PUBLIC_APP_URL) origins.push(process.env.NEXT_PUBLIC_APP_URL);

    // Vercel 프리뷰 URL: 프로젝트 도메인 패턴만 허용 (와일드카드 방지)
    const reqOrigin = request?.headers?.get?.("origin");
    if (reqOrigin) {
      const projectDomain = process.env.VERCEL_PROJECT_DOMAIN || "activation-erp";
      const isVercelPreview =
        reqOrigin.endsWith(".vercel.app") &&
        reqOrigin.includes(projectDomain);
      if (isVercelPreview) {
        origins.push(reqOrigin);
      }
    }

    return origins;
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
    minPasswordLength: 8,
  },
  rateLimit: {
    window: 60,      // 60초 윈도우
    max: 30,         // 전체 API 최대 30회/분
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5분 캐시
    },
  },
});

export type Session = typeof auth.$Infer.Session;
