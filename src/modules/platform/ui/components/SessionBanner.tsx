"use client";

/**
 * Banner persistente T−2 min: countdown en vivo + "Renovar ahora" (abre el
 * ReLoginModal sin esperar a T−0). Desaparece al renovar la sesión o al
 * expirar (el modal toma el relevo). Tono warning — el rojo de marca nunca
 * significa peligro (spec §4).
 */
import { TriangleAlert } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { usePlatformAuth } from "../../infrastructure/auth/platform-auth.context";
import { useSessionCountdown } from "../../infrastructure/hooks/use-session-countdown";

export function SessionBanner() {
  const { warning, expired, reloginOpen, openRelogin } = usePlatformAuth();
  const { mmss } = useSessionCountdown();

  if (!warning || expired || reloginOpen) return null;

  return (
    <div
      role="alert"
      className="sticky top-[52px] z-30 flex items-center justify-between gap-3 border-b border-warning/30 bg-warning/10 px-4 py-2 md:px-6"
    >
      <p className="flex items-center gap-2 text-sm text-foreground">
        <TriangleAlert aria-hidden="true" className="size-4 shrink-0 text-warning" />
        Tu sesión expira en <span className="font-medium tabular-nums">{mmss}</span>
      </p>
      <Button size="sm" variant="outline" onClick={openRelogin}>
        Renovar ahora
      </Button>
    </div>
  );
}
