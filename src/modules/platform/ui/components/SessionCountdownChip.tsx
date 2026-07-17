"use client";

/**
 * Chip discreto `mm:ss` de sesión restante (footer del sidebar): el admin
 * sabe cuándo tendrá que renovar en medio de una operación larga (spec §2.2).
 * En T−2 min adopta el tono warning para acompañar al banner.
 */
import { Timer } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { useSessionCountdown } from "../../infrastructure/hooks/use-session-countdown";

export function SessionCountdownChip({ className }: { className?: string }) {
  const { mmss, warning } = useSessionCountdown();

  return (
    <span
      role="status"
      aria-label={`Sesión restante: ${mmss}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs tabular-nums",
        warning
          ? "border-warning/40 bg-warning/10 text-warning"
          : "border-border text-muted-foreground",
        className,
      )}
    >
      <Timer aria-hidden="true" className="size-3" />
      {mmss}
    </span>
  );
}
