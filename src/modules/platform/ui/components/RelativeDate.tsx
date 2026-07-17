"use client";

/**
 * Fecha relativa con la absoluta en tooltip (patrón del spec §4 para todo el
 * panel: tablas, auditoría, analytics). Reutiliza los formatters
 * transversales — no re-implementa Intl.
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
