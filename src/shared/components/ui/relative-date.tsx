"use client";

/**
 * Fecha relativa con la absoluta en tooltip. Primitivo transversal: lo usan la
 * consola de plataforma, el rail de contexto del inbox y las tablas del panel.
 * Reutiliza los formatters de `core/lib` — no re-implementa `Intl`.
 */
import { relativeTime } from "@/core/lib/relative-time";
import { formatShortDate } from "@/core/lib/format";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";

export function RelativeDate({ iso, className }: { iso: string | null; className?: string }) {
  if (!iso) return <span className={className}>—</span>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time dateTime={iso} className={className}>
          {relativeTime(iso)}
        </time>
      </TooltipTrigger>
      <TooltipContent>{formatShortDate(iso)}</TooltipContent>
    </Tooltip>
  );
}
