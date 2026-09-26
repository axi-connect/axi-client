import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ChevronRight } from "lucide-react";
import { BentoLink, BentoTile, StatePill } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import {
  CALL_PURPOSE_LABELS,
  DIRECTION_LABELS,
  callResultPill,
  type CallSessionRowDTO,
} from "@/modules/calls/domain/call";
import { formatCallClock } from "@/modules/calls/ui/lib/call-format";

/**
 * «Terminadas hace poco» (canvas, tablero 1): las últimas llamadas cerradas
 * como lista — quién, para qué, cuánto duró, cómo terminó y cuándo. Cada fila
 * abre su detalle.
 */
export function RecentCallsTile({
  rows,
  error,
  onRetry,
  className,
}: {
  rows: CallSessionRowDTO[] | null;
  error: string | null;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <BentoTile
      label="Terminadas hace poco"
      aside={<BentoLink href="/calls/history">Todo el historial</BentoLink>}
      className={className}
    >
      {error !== null ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm text-muted-foreground">
          {error}
          <Button variant="outline" size="sm" className="rounded-full" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      ) : rows === null ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          Aún no hay llamadas terminadas en este ciclo. Aparecen aquí apenas cuelgan.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => {
            const outbound = row.direction === "outbound";
            const phone = outbound ? row.to_number : row.from_number;
            const result = callResultPill(row);
            const Arrow = outbound ? ArrowUpRight : ArrowDownLeft;
            return (
              <li key={row.id}>
                <Link
                  href={`/calls/${row.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 py-3 focus-visible:outline-2 focus-visible:outline-ring md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_64px_minmax(0,auto)_104px_16px]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Arrow aria-hidden className="size-3.5" />
                      <span className="sr-only">{DIRECTION_LABELS[row.direction]}</span>
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-semibold">{row.contact?.name ?? phone}</span>
                      <span className="truncate font-mono text-[11px] text-muted-foreground">{phone}</span>
                    </span>
                  </span>
                  <span className="hidden truncate text-xs text-muted-foreground md:block">
                    {CALL_PURPOSE_LABELS[row.purpose]}
                    {row.attempt > 1 ? ` · intento ${row.attempt}` : ""}
                  </span>
                  <span className="hidden font-mono text-xs tabular-nums md:block">
                    {row.duration_seconds === null ? "—" : formatCallClock(row.duration_seconds)}
                  </span>
                  <span className="justify-self-end md:justify-self-start">
                    <StatePill tone={result.tone}>{result.label}</StatePill>
                  </span>
                  <RelativeDate iso={row.created_at} className="hidden text-xs text-muted-foreground md:block" />
                  <ChevronRight aria-hidden className="hidden size-4 text-muted-foreground md:block" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </BentoTile>
  );
}
