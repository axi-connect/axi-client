"use client";

/**
 * Cuenta atrás de la sesión, en el pie de la barra lateral: «Sesión · 12:40
 * restantes». El admin sabe cuándo tendrá que renovar en medio de una
 * operación larga (spec §2.2). En T−2 min se marca con el punto ámbar y
 * acompaña al aviso `SessionBanner`.
 */
import { cn } from "@/core/lib/utils";
import { useSessionCountdown } from "../../infrastructure/hooks/use-session-countdown";

export function SessionCountdownChip({ className }: { className?: string }) {
  const { mmss, warning } = useSessionCountdown();

  return (
    <span
      role="status"
      aria-label={`Sesión restante: ${mmss}`}
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground tabular-nums",
        warning && "font-medium text-foreground",
        className,
      )}
    >
      {warning ? <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-warning" /> : null}
      <span className="min-w-0 truncate">Sesión · {mmss} restantes</span>
    </span>
  );
}
