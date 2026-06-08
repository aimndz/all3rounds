"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth-store";

const MIN_REVALIDATE_INTERVAL = 30000; // 30 seconds

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const lastFetchTimeRef = useRef<number>(0);

  useEffect(() => {
    const triggerFetch = async () => {
      const now = Date.now();
      if (now - lastFetchTimeRef.current < MIN_REVALIDATE_INTERVAL) {
        return;
      }
      lastFetchTimeRef.current = now;
      await fetchUser();
    };

    triggerFetch();

    const handleRevalidate = () => {
      if (document.visibilityState === "visible") {
        void triggerFetch();
      }
    };

    window.addEventListener("focus", handleRevalidate);
    document.addEventListener("visibilitychange", handleRevalidate);

    return () => {
      window.removeEventListener("focus", handleRevalidate);
      document.removeEventListener("visibilitychange", handleRevalidate);
    };
  }, [fetchUser]);

  return children;
}
