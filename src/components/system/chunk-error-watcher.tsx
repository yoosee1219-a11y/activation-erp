"use client";

import { useEffect } from "react";

const STORAGE_KEY = "__chunk_reload_attempt__";

function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const name = (err as { name?: unknown })?.name;
  const message =
    typeof err === "string"
      ? err
      : ((err as { message?: unknown })?.message as string | undefined) ?? "";
  return (
    name === "ChunkLoadError" ||
    /Loading chunk \d+ failed/i.test(message) ||
    /Failed to load chunk/i.test(message) ||
    /Loading CSS chunk/i.test(message) ||
    /ChunkLoadError/i.test(message)
  );
}

function tryReload() {
  if (typeof window === "undefined") return;
  const attempted = window.sessionStorage.getItem(STORAGE_KEY);
  if (attempted) return;
  window.sessionStorage.setItem(STORAGE_KEY, "1");
  // eslint-disable-next-line no-console
  console.warn("[ChunkErrorWatcher] Reloading once due to stale chunk.");
  window.location.reload();
}

export function ChunkErrorWatcher() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (isChunkLoadError(event.error) || isChunkLoadError(event.message)) {
        tryReload();
      }
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadError(event.reason)) {
        tryReload();
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
