import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { InkIsland, Kicker } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { namesPhrase, nextUpTitle, type MinutesOutlook } from "./monitor-copy";

const TONE_DOT = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  neutral: "bg-muted-foreground",
} as const;

export const CALLBACKS_HREF = "/calls/history?outcome=callback_requested";

/**
 * «Lo próximo» del Monitoreo (canvas, tablero 1): la isla de la vista, con lo
 * accionable de verdad — quién pidió que lo llamen (desenlace
 * `callback_requested` del ciclo), lo que no se pudo completar y los minutos
 * que quedan. Sin nada pendiente lo dice: «Todo al día».
 */
export function NextUpIsland({
  unavailable = false,
  onRetry,
  callbacks,
  failed,
  minutes,
  className,
}: {
  /** No se pudo leer lo pendiente: se dice, jamás «Todo al día» sin haber mirado. */
  unavailable?: boolean;
  onRetry?: () => void;
  /** null mientras carga. */
  callbacks: { total: number; names: string[] } | null;
  failed: number | null;
  minutes: MinutesOutlook | null;
  className?: string;
}) {
  const loading = callbacks === null || failed === null || minutes === null;
  const paused = minutes?.tone === "destructive";
  const rows: { key: string; figure: string; title: string; detail: string; href: string; dot?: keyof typeof TONE_DOT }[] = [];
  if (!loading) {
    if (callbacks.total > 0) {
      rows.push({
        key: "callbacks",
        figure: String(callbacks.total),
        title: callbacks.total === 1 ? "pidió que le devuelvas la llamada" : "pidieron que les devuelvas la llamada",
        detail: namesPhrase(callbacks.names, callbacks.total),
        href: CALLBACKS_HREF,
      });
    }
    if (failed > 0) {
      rows.push({
        key: "failed",
        figure: String(failed),
        title: failed === 1 ? "no se pudo completar" : "no se pudieron completar",
        detail: "en este ciclo · mira el motivo en el historial",
        href: "/calls/history",
        dot: "destructive",
      });
    }
    if (minutes.remainingMinutes !== null && minutes.tone !== "success") {
      rows.push({
        key: "minutes",
        figure: String(minutes.remainingMinutes),
        title: minutes.remainingMinutes === 1 ? "minuto te queda del ciclo" : "minutos te quedan del ciclo",
        detail: `usaste ${minutes.usedMinutes} de ${minutes.limitMinutes ?? 0}`,
        href: "/calls/settings",
        dot: minutes.tone,
      });
    }
  }

  return (
    <InkIsland label="Lo próximo" className={cn("gap-1", className)}>
      <Kicker>Lo próximo</Kicker>
      {unavailable ? (
        <>
          <h2 className="mt-1 mb-2 font-heading text-2xl leading-tight font-bold tracking-tight text-balance">
            No pudimos revisar lo pendiente
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Tus llamadas siguen su curso. Vuelve a intentarlo en un momento.
          </p>
          <div className="min-h-2 flex-1" />
          {onRetry !== undefined && (
            <Button variant="contrast" className="mt-3 rounded-full" onClick={onRetry}>
              Reintentar
            </Button>
          )}
        </>
      ) : loading ? (
        <div className="mt-2 flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-7 w-4/5 rounded-lg" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ) : (
        <>
          <h2 className="mt-1 mb-2 font-heading text-2xl leading-tight font-bold tracking-tight text-balance">
            {nextUpTitle({ callbacks: callbacks.total, failed, paused })}
          </h2>
          {rows.length === 0 ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Nadie espera tu llamada y todo salió. Cuando algo necesite de ti, aparece aquí.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((row) => (
                <li key={row.key}>
                  <Link
                    href={row.href}
                    className="flex min-w-0 items-center gap-3.5 rounded-xl px-1 py-3.5 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span className="min-w-11 font-heading text-[28px] leading-none font-bold tracking-tight tabular-nums">
                      {row.figure}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-sm leading-snug font-semibold">{row.title}</span>
                      <span className="truncate text-xs text-muted-foreground" title={row.detail}>
                        {row.detail}
                      </span>
                    </span>
                    {row.dot !== undefined ? (
                      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[row.dot])} />
                    ) : (
                      <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="min-h-2 flex-1" />
          <div className="mt-3 flex flex-wrap gap-2.5">
            {callbacks.total > 0 && (
              <Button asChild variant="contrast" className="flex-1 rounded-full">
                <Link href={CALLBACKS_HREF}>Ver quién pidió</Link>
              </Button>
            )}
            <Button asChild variant="glass" className="flex-1">
              <Link href="/calls/history">Ver el historial</Link>
            </Button>
          </div>
        </>
      )}
    </InkIsland>
  );
}
