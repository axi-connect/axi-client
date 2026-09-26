import { Clock } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { BentoTile, StatePill } from "@/shared/components/features/bento";
import type { MinutesOutlook } from "./monitor-copy";

const FILL = {
  success: "bg-foreground",
  warning: "bg-warning",
  destructive: "bg-destructive",
  neutral: "bg-foreground",
} as const;

/**
 * Minutos del ciclo como recorrido (canvas, tablero 1): cuántos van, cuántos
 * quedan y qué pasa a este ritmo. El color del estado va en la pastilla y en
 * la barra, nunca en el texto.
 */
export function MinutesTile({ outlook, className }: { outlook: MinutesOutlook; className?: string }) {
  const { usedMinutes, limitMinutes, remainingMinutes, pct, tone } = outlook;
  return (
    <BentoTile
      label="Minutos del ciclo"
      aside={pct === null ? undefined : <StatePill tone={tone}>{Math.round(pct)} %</StatePill>}
      className={className}
    >
      <p className="flex items-baseline gap-2">
        <span className="font-heading text-4xl leading-none font-bold tracking-tight tabular-nums">{usedMinutes}</span>
        <span className="text-sm text-muted-foreground">
          {limitMinutes === null ? "min usados · sin tope" : `de ${limitMinutes} min`}
        </span>
      </p>
      {pct !== null && (
        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="meter"
          aria-label="Minutos usados del ciclo"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
        >
          <div className={cn("h-full rounded-full", FILL[tone])} style={{ width: `${pct}%` }} />
        </div>
      )}
      {remainingMinutes !== null && (
        <p className="text-sm">
          Te quedan <b className="font-semibold tabular-nums">{remainingMinutes} min</b>
        </p>
      )}
      {outlook.outlook !== null && <p className="text-xs leading-relaxed text-muted-foreground">{outlook.outlook}</p>}
      <div className="flex-1" />
      <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock aria-hidden className="size-3.5" />
        se mide por segundo real de llamada · según tu plan
      </p>
    </BentoTile>
  );
}
