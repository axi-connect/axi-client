"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

import { TURNSTILE_SITE_KEY } from "@/core/config/env";

/**
 * Widget de Cloudflare Turnstile del alta. Se monta solo con
 * `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; sin ella no hay captcha en el cliente y el
 * backend valida con su verificador `noop` (solo fuera de producción).
 *
 * Render explícito en vez del modo implícito (`class="cf-turnstile"`): así el
 * token llega por callback a React y no a un `<input hidden>` que habría que
 * leer del DOM. `theme: "auto"` sigue al tema del sistema, que es el que usa
 * `next-themes` por defecto.
 */
declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          language?: string;
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

export const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function TurnstileWidget({ onToken }: { onToken: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    // Copia local: el narrowing de la constante no sobrevive dentro de `mount`.
    const siteKey = TURNSTILE_SITE_KEY;
    if (!siteKey) return;
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    const mount = () => {
      if (cancelled || widgetRef.current || !window.turnstile) return;
      widgetRef.current = window.turnstile.render(container, {
        sitekey: siteKey,
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(""),
        "error-callback": () => onTokenRef.current(""),
        theme: "auto",
        language: "es",
      });
    };

    // El script puede llegar antes o después de este efecto: se intenta ya y,
    // si aún no está, se vuelve a intentar cuando `next/script` avise.
    mount();
    window.addEventListener("axi:turnstile:loaded", mount);
    return () => {
      cancelled = true;
      window.removeEventListener("axi:turnstile:loaded", mount);
      if (widgetRef.current) {
        window.turnstile?.remove(widgetRef.current);
        widgetRef.current = null;
      }
    };
  }, []);

  if (!TURNSTILE_SITE_KEY) return null;

  return (
    <>
      <Script
        src={TURNSTILE_SCRIPT_URL}
        strategy="afterInteractive"
        onLoad={() => window.dispatchEvent(new Event("axi:turnstile:loaded"))}
      />
      <div ref={containerRef} className="min-h-16" aria-label="Verificación de seguridad" />
    </>
  );
}
