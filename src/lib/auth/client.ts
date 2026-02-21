import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // baseURL 생략 → 브라우저에서 현재 origin 기준 상대 경로 사용
  // Vercel 프리뷰 URL에서도 CORS 없이 동작
});

export const { signIn, signUp, signOut, useSession } = authClient;
