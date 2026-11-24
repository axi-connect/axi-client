"use client";

/**
 * Aviso T−2 min (rediseño F1, mismo comportamiento): cuenta atrás en vivo +
 * «Renovar ahora», que abre el `ReLoginModal` sin esperar a T−0. Desaparece
 * al renovar o al vencer (el modal toma el relevo). Franja de tinta con el
 * reloj en ámbar: el rojo de marca nunca significa peligro (spec §4).
 */
import { Timer } from "lucide-react";
import { usePlatformAuth } from "../../infrastructure/auth/platform-auth.context";
import { useSessionCountdown } from "../../infrastructure/hooks/use-session-countdown";

export function SessionBanner() {
  const { warning, expired, reloginOpen, openRelogin } = usePlatformAuth();
  const { mmss } = useSessionCountdown();

  if (!warning || expired || reloginOpen) return null;

  return (
    <div className="px-4 pt-3 md:px-6">
      <div
        role="alert"
        className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-3.5 gap-y-2.5 rounded-[20px] bg-foreground py-2.5 pr-3 pl-4 text-[13px] text-background shadow-[var(--shadow-overlay)]"
      >
        <Timer aria-hidden="true" className="size-4 shrink-0 text-warning" />
        <p className="min-w-0 flex-[1_1_16rem] text-pretty">
          <span className="font-semibold">
            Tu sesión expira en <span className="tabular-nums">{mmss}</span>.
          </span>{" "}
          Lo que no hayas guardado se pierde al vencer.
        </p>
        <button
          type="button"
          onClick={openRelogin}
          className="inline-flex h-8 shrink-0 items-center rounded-full bg-background px-3.5 text-[13px] font-medium text-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"
        >
          Renovar ahora
        </button>
      </div>
    </div>
  );
}
