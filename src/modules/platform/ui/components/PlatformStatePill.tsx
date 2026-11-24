/**
 * El ÚNICO estado del panel de plataforma (rediseño F1): `bg-muted` + punto
 * del color + texto en foreground (DESIGN-SYSTEM §9.5, pasa AA en los dos
 * temas). Lo transitorio cambia el punto por un spinner. El vocabulario vive
 * en `domain/platform-states.ts`; aquí solo se pinta.
 */
import { LoaderCircle } from "lucide-react";
import { cn } from "@/core/lib/utils";
import type { StatusTone } from "@/shared/components/features/status-badge/types";
import { platformState, type StateSubject } from "../../domain/platform-states";

const DOT: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
  neutral: "bg-muted-foreground",
};

type PlatformStatePillProps = {
  status: string;
  /** «tenant» = rótulo en femenino («Activa», «Suspendida»). */
  subject?: StateSubject;
  className?: string;
};

export function PlatformStatePill({ status, subject, className }: PlatformStatePillProps) {
  const entry = platformState(status, subject);
  return (
    <span
      data-tone={entry.tone}
      title={entry.label === status ? undefined : status}
      className={cn(
        "inline-flex h-6 max-w-full shrink-0 items-center gap-1.5 rounded-full bg-muted px-2.5 text-xs font-medium whitespace-nowrap text-foreground",
        className,
      )}
    >
      {entry.transient ? (
        <LoaderCircle aria-hidden="true" className="size-3 shrink-0 animate-spin text-muted-foreground" />
      ) : (
        <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", DOT[entry.tone])} />
      )}
      <span className="min-w-0 truncate">{entry.label}</span>
    </span>
  );
}
