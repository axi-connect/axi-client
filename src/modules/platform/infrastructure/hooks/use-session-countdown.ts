"use client";

/**
 * Countdown de la sesión de plataforma (chip del sidebar y banner T−2 min).
 * Tick de 1 s recalculando contra `expiresAt` absoluto (nunca acumulando):
 * el valor es correcto aunque la pestaña haya estado throttled.
 */
import { useEffect, useState } from "react";
import { SESSION_WARNING_MS } from "../../domain/auth";
import { usePlatformAuth } from "../auth/platform-auth.context";

function msToMmss(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function useSessionCountdown(): { mmss: string; msLeft: number; warning: boolean } {
  const { session } = usePlatformAuth();
  const expiresAt = session?.expiresAt ?? 0;
  const [msLeft, setMsLeft] = useState(() => Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    setMsLeft(Math.max(0, expiresAt - Date.now()));
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const left = Math.max(0, expiresAt - Date.now());
      setMsLeft(left);
      if (left === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return { mmss: msToMmss(msLeft), msLeft, warning: msLeft > 0 && msLeft <= SESSION_WARNING_MS };
}
