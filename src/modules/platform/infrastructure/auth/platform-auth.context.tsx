"use client";

/**
 * Sesión del panel de plataforma (super admin). Access token ~15 min SIN
 * refresh: la expiración se maneja con re-login superpuesto (ReLoginModal),
 * nunca con redirect — la vista y sus borradores se preservan (spec D1).
 *
 * Timers absolutos recalculados desde `expiresAt − Date.now()` (nunca
 * contadores acumulados): inmunes al throttling de pestañas en background.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  PLATFORM_SESSION_EXPIRED_EVENT,
  SESSION_WARNING_MS,
  type PlatformSession,
} from "../../domain/auth";
import { platformClient, PLATFORM_LOGIN_PATH } from "../api/platform-client";
import {
  clearPlatformSession,
  restorePlatformSession,
  savePlatformSession,
} from "./token-storage";

type PlatformAuthContextValue = {
  /** `loading` solo durante la hidratación inicial (lectura de sessionStorage). */
  status: "loading" | "unauthenticated" | "authenticated";
  session: PlatformSession | null;
  /** T−2 min: el banner de renovación debe mostrarse. */
  warning: boolean;
  /** El token venció (T−0 o 401): el ReLoginModal es obligatorio. */
  expired: boolean;
  /** El ReLoginModal está abierto (expiración o "Renovar ahora"). Pausa el polling. */
  reloginOpen: boolean;
  login: (email: string, password: string) => Promise<void>;
  /** Re-login con el email de la sesión (solo pide contraseña). */
  relogin: (password: string) => Promise<void>;
  /** Abre el ReLoginModal sin esperar a T−0 (banner "Renovar ahora"). */
  openRelogin: () => void;
  /** Cierra el modal si el token sigue vivo (renovación anticipada cancelada). */
  dismissRelogin: () => void;
  logout: () => void;
};

const PlatformAuthContext = createContext<PlatformAuthContextValue | null>(null);

export function PlatformAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<PlatformAuthContextValue["status"]>("loading");
  const [session, setSession] = useState<PlatformSession | null>(null);
  const [warning, setWarning] = useState(false);
  const [expired, setExpired] = useState(false);
  const [reloginOpen, setReloginOpen] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  /** Programa el aviso T−2 min y la expiración T−0 desde el epoch absoluto. */
  const scheduleTimers = useCallback(
    (expiresAt: number) => {
      clearTimers();
      const now = Date.now();
      const untilWarning = expiresAt - SESSION_WARNING_MS - now;
      const untilExpiry = expiresAt - now;
      if (untilWarning > 0) {
        timersRef.current.push(setTimeout(() => setWarning(true), untilWarning));
      } else {
        setWarning(true);
      }
      timersRef.current.push(
        setTimeout(() => {
          setExpired(true);
          setReloginOpen(true);
        }, Math.max(untilExpiry, 0)),
      );
    },
    [clearTimers],
  );

  /** Estado post-login/re-login exitoso: sesión fresca y timers reprogramados. */
  const activateSession = useCallback(
    (email: string, expiresIn: number, token: string) => {
      const expiresAt = Date.now() + expiresIn * 1000;
      savePlatformSession({ token, email, expiresAt });
      setSession({ email, expiresAt });
      setStatus("authenticated");
      setWarning(false);
      setExpired(false);
      setReloginOpen(false);
      scheduleTimers(expiresAt);
    },
    [scheduleTimers],
  );

  const requestLogin = useCallback(async (email: string, password: string) => {
    const { data } = await platformClient.POST(PLATFORM_LOGIN_PATH, {
      body: { email, password },
    });
    // El middleware lanza HttpError en !ok; aquí `data` siempre existe.
    return data!;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await requestLogin(email, password);
      activateSession(email, tokens.expires_in, tokens.access_token);
    },
    [requestLogin, activateSession],
  );

  const relogin = useCallback(
    async (password: string) => {
      const email = session?.email;
      if (!email) return;
      const tokens = await requestLogin(email, password);
      activateSession(email, tokens.expires_in, tokens.access_token);
      // Reintenta todo lo que falló o quedó stale durante la expiración.
      queryClient.invalidateQueries();
    },
    [session?.email, requestLogin, activateSession, queryClient],
  );

  const logout = useCallback(() => {
    clearTimers();
    clearPlatformSession();
    setSession(null);
    setStatus("unauthenticated");
    setWarning(false);
    setExpired(false);
    setReloginOpen(false);
    queryClient.clear();
    router.replace("/platform/login");
  }, [clearTimers, queryClient, router]);

  const openRelogin = useCallback(() => setReloginOpen(true), []);
  const dismissRelogin = useCallback(() => {
    // Solo se puede cerrar si el token sigue vivo; expirado es bloqueante.
    if (!expired) setReloginOpen(false);
  }, [expired]);

  // Hidratación inicial desde sessionStorage (sobrevive F5).
  useEffect(() => {
    const restored = restorePlatformSession();
    if (restored && restored.expiresAt > Date.now()) {
      setSession(restored);
      setStatus("authenticated");
      scheduleTimers(restored.expiresAt);
    } else if (restored) {
      // Hubo sesión pero venció: modal con email pre-llenado, sin redirect.
      setSession(restored);
      setStatus("authenticated");
      setExpired(true);
      setReloginOpen(true);
    } else {
      setStatus("unauthenticated");
    }
    return clearTimers;
    // Solo al montar: scheduleTimers/clearTimers son estables (useCallback).
  }, [scheduleTimers, clearTimers]);

  // 401 de cualquier request autenticada → re-login inmediato.
  useEffect(() => {
    const onExpired = () => {
      setExpired(true);
      setReloginOpen(true);
    };
    window.addEventListener(PLATFORM_SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(PLATFORM_SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const value = useMemo<PlatformAuthContextValue>(
    () => ({ status, session, warning, expired, reloginOpen, login, relogin, openRelogin, dismissRelogin, logout }),
    [status, session, warning, expired, reloginOpen, login, relogin, openRelogin, dismissRelogin, logout],
  );

  return <PlatformAuthContext.Provider value={value}>{children}</PlatformAuthContext.Provider>;
}

export function usePlatformAuth(): PlatformAuthContextValue {
  const ctx = useContext(PlatformAuthContext);
  if (!ctx) throw new Error("usePlatformAuth debe usarse dentro de PlatformAuthProvider");
  return ctx;
}
