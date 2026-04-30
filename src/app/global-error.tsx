"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const message = `${error?.name ?? ""} ${error?.message ?? ""}`;
    const isChunkLoadError =
      error?.name === "ChunkLoadError" ||
      /Loading chunk \d+ failed/i.test(message) ||
      /Failed to load chunk/i.test(message) ||
      /Loading CSS chunk/i.test(message);

    if (!isChunkLoadError) return;

    if (typeof window === "undefined") return;

    const storageKey = "__chunk_reload_attempt__";
    const attempted = window.sessionStorage.getItem(storageKey);
    if (attempted) {
      window.sessionStorage.removeItem(storageKey);
      return;
    }
    window.sessionStorage.setItem(storageKey, "1");
    window.location.reload();
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          background: "#0a0a0a",
          color: "#fafafa",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
            일시적인 오류가 발생했어요
          </h2>
          <p style={{ fontSize: 14, color: "#a1a1aa", marginBottom: 20 }}>
            새 버전이 배포되어 페이지를 다시 불러와야 합니다.
          </p>
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.sessionStorage.removeItem("__chunk_reload_attempt__");
                window.location.reload();
              } else {
                reset();
              }
            }}
            style={{
              background: "#fafafa",
              color: "#0a0a0a",
              border: "none",
              borderRadius: 6,
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            새로고침
          </button>
        </div>
      </body>
    </html>
  );
}
