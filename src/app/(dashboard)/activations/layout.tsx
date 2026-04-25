// 인증 필요한 페이지 — prerender 비활성화 (useSearchParams Suspense bailout 회피)
export const dynamic = "force-dynamic";

export default function ActivationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
