"use client";

import { useEffect, useState } from "react";
import { Phone, PhoneCall, PhoneOutgoing, Target, Timer } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { formatDuration } from "@/core/lib/format";
import { useAuth } from "@/shared/auth/auth.hooks";
import { EmptyState } from "@/shared/components/features/empty-state";
import { StatTile } from "@/shared/components/features/stat-tile";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { CallsOverviewDTO, CallsOverviewGranularity } from "@/modules/calls/domain/call";
import { useCallsSocket } from "@/modules/calls/infrastructure/realtime/use-calls-socket";
import { getCallsOverview } from "@/modules/calls/infrastructure/services/calls-service.adapter";
import { useLiveCallsStore } from "@/modules/calls/infrastructure/stores/live-calls.store";
import { ActivityChart } from "@/modules/calls/ui/components/ActivityChart";
import { LiveCallCard } from "@/modules/calls/ui/components/LiveCallCard";
import { TestCallDialog } from "@/modules/calls/ui/components/TestCallDialog";

const CARD = "border-border shadow-float bg-background rounded-lg border p-5";

const GRANULARITIES: { value: CallsOverviewGranularity; label: string }[] = [
  { value: "day", label: "Hoy" },
  { value: "week", label: "7 días" },
  { value: "month", label: "30 días" },
];

/**
 * Monitoreo (`/calls`): KPIs del ciclo con tendencia, gráfico de actividad y
 * las llamadas en curso en vivo (WS `call.*` → re-fetch de /sessions/live).
 */
export function CallsMonitorView() {
  const { hasPermission } = useAuth();
  const canPlace = hasPermission("calls:place");

  const [overview, setOverview] = useState<CallsOverviewDTO | null>(null);
  const [granularity, setGranularity] = useState<CallsOverviewGranularity>("week");
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useCallsSocket();
  const { calls, initialized, error: liveError, fetchLive } = useLiveCallsStore();

  useEffect(() => {
    void fetchLive();
  }, [fetchLive]);

  useEffect(() => {
    let cancelled = false;
    setOverviewError(null);
    getCallsOverview(granularity)
      .then((data) => {
        if (!cancelled) setOverview(data);
      })
      .catch((error: unknown) => {
        if (!cancelled) setOverviewError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [granularity]);

  // UN interval para todos los timers de las cards en curso
  useEffect(() => {
    if (calls.length === 0) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [calls.length]);

  const minutes = overview?.minutes ?? null;
  const minutesPct =
    minutes !== null && minutes.limit_seconds !== null && minutes.limit_seconds > 0
      ? Math.min(100, (minutes.used_seconds / minutes.limit_seconds) * 100)
      : null;
  const paused = minutesPct !== null && minutesPct >= 100;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground max-w-2xl text-sm">
          Tu agente hace y contesta llamadas con su propia voz. Cada llamada queda grabada,
          transcrita y resumida en la ficha del contacto.
        </p>
        {canPlace && (
          <Button className="rounded-full" onClick={() => setDialogOpen(true)}>
            <PhoneOutgoing className="size-4" aria-hidden />
            Llamada de prueba
          </Button>
        )}
      </div>

      {overview !== null && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Llamadas este ciclo"
            value={overview.kpis.total}
            icon={PhoneCall}
            hint={trendHint(overview.kpis.total, overview.previous.total)}
          />
          <StatTile
            label="Contestadas"
            value={overview.kpis.answered}
            icon={Phone}
            hint={trendHint(overview.kpis.answered, overview.previous.answered)}
          />
          <StatTile
            label="Duración promedio"
            value={
              overview.kpis.avg_duration_seconds === null
                ? null
                : formatDuration(overview.kpis.avg_duration_seconds)
            }
            icon={Timer}
            hint={trendHint(
              overview.kpis.avg_duration_seconds,
              overview.previous.avg_duration_seconds,
            )}
          />
          <StatTile
            label="Objetivo cumplido"
            value={`${overview.kpis.goal_met_pct} %`}
            icon={Target}
            hint={`${overview.kpis.goal_met} llamadas lograron su objetivo`}
          />
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="flex flex-col gap-5">
          <section className={CARD}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Actividad de llamadas</h2>
                <p className="text-muted-foreground text-xs">
                  Volumen saliente y entrante en la ventana elegida.
                </p>
              </div>
              <SegmentedControl
                value={granularity}
                onValueChange={(value) => setGranularity(value as CallsOverviewGranularity)}
                label="Ventana del gráfico"
                size="sm"
                surface="inline"
                items={GRANULARITIES}
              />
            </div>
            {overviewError !== null ? (
              <p className="text-muted-foreground py-10 text-center text-sm">{overviewError}</p>
            ) : overview === null ? (
              <Skeleton className="h-44 w-full rounded-lg" />
            ) : (
              <ActivityChart series={overview.series} granularity={granularity} />
            )}
          </section>

          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">Llamadas en curso</h2>
              <span className="text-muted-foreground text-xs tabular-nums">
                {calls.length === 1 ? "1 activa" : `${calls.length} activas`}
              </span>
            </div>
            {liveError !== null ? (
              <div className="border-border bg-background rounded-lg border p-6 text-center" role="alert">
                <p className="text-muted-foreground text-sm">{liveError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 rounded-full"
                  onClick={() => void fetchLive()}
                >
                  Reintentar
                </Button>
              </div>
            ) : !initialized ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Skeleton className="h-28 rounded-lg" />
                <Skeleton className="h-28 rounded-lg" />
              </div>
            ) : calls.length === 0 ? (
              <EmptyState
                icon={Phone}
                accent="violet"
                title="Nadie está al teléfono"
                description="Cuando tu agente esté en una llamada, la verás aquí en vivo — con acceso al transcript mientras conversa."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {calls.map((call) => (
                  <LiveCallCard key={call.id} call={call} now={now} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <section className={`${CARD} border-l-accent-violet border-l-2`}>
            <h2 className="text-accent-violet text-xs font-semibold tracking-wide uppercase">
              Minutos del ciclo
            </h2>
            {minutes === null ? (
              <Skeleton className="mt-3 h-10 w-full rounded" />
            ) : (
              <>
                <p className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tabular-nums">
                    {Math.round(minutes.used_seconds / 60)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {minutes.limit_seconds === null
                      ? "min usados · sin tope"
                      : `de ${Math.round(minutes.limit_seconds / 60)} min`}
                  </span>
                </p>
                {minutesPct !== null && <Progress value={minutesPct} className="mt-2 h-1.5" />}
                <p className="text-muted-foreground mt-2 text-xs">
                  {paused
                    ? "Cuota agotada: las llamadas están en pausa hasta el próximo ciclo. El chat sigue con normalidad."
                    : "Al agotarse, las llamadas se pausan; el chat sigue con normalidad."}
                </p>
              </>
            )}
          </section>
        </aside>
      </div>

      <TestCallDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

/** «▲ 12.8 % vs ciclo anterior» — sin ciclo anterior no hay tendencia. */
function trendHint(current: number | null, previous: number | null): string | undefined {
  if (current === null || previous === null || previous === 0) return undefined;
  const delta = ((current - previous) / previous) * 100;
  if (!Number.isFinite(delta)) return undefined;
  const arrow = delta >= 0 ? "▲" : "▼";
  return `${arrow} ${Math.abs(delta).toFixed(1)} % vs ciclo anterior`;
}
