"use client";

import { useCallback, useEffect, useState } from "react";
import { PhoneOutgoing, RotateCcw } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAuth } from "@/shared/auth/auth.hooks";
import { BentoTile } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  isLiveCallStatus,
  type CallSessionRowDTO,
  type CallsOverviewDTO,
  type CallsOverviewGranularity,
} from "@/modules/calls/domain/call";
import { useCallsSocket } from "@/modules/calls/infrastructure/realtime/use-calls-socket";
import {
  getCallsOverview,
  listCallSessions,
} from "@/modules/calls/infrastructure/services/calls-service.adapter";
import { useLiveCallsStore } from "@/modules/calls/infrastructure/stores/live-calls.store";
import { ActivityChart } from "@/modules/calls/ui/components/ActivityChart";
import { CallsPageHeader } from "@/modules/calls/ui/components/CallsPageHeader";
import { TestCallDialog } from "@/modules/calls/ui/components/TestCallDialog";
import { CycleTile } from "@/modules/calls/ui/monitor/CycleTile";
import { LiveNowTile } from "@/modules/calls/ui/monitor/LiveNowTile";
import { MinutesTile } from "@/modules/calls/ui/monitor/MinutesTile";
import { minutesOutlook } from "@/modules/calls/ui/monitor/monitor-copy";
import { NextUpIsland } from "@/modules/calls/ui/monitor/NextUpIsland";
import { RecentCallsTile } from "@/modules/calls/ui/monitor/RecentCallsTile";

const GRANULARITIES: { value: CallsOverviewGranularity; label: string }[] = [
  { value: "day", label: "Hoy" },
  { value: "week", label: "7 días" },
  { value: "month", label: "30 días" },
];

const RECENT_ROWS = 4;

/**
 * Monitoreo (`/calls`, llamadas premium F5, canvas tablero 1): el bento del
 * módulo. Arriba las llamadas en curso con su aura y la isla «Lo próximo»; el
 * ciclo, la actividad, los minutos y lo último que terminó debajo. El WS del
 * tenant (`call.*`) refresca la parrilla en vivo; cada tarjeta se une a la
 * sala de su llamada para saber quién habla.
 */
export function CallsMonitorView() {
  const { hasPermission } = useAuth();
  const canPlace = hasPermission("calls:place");

  const [overview, setOverview] = useState<CallsOverviewDTO | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<CallsOverviewGranularity>("week");
  const [callbacks, setCallbacks] = useState<{ total: number; names: string[] } | "error" | null>(null);
  const [recent, setRecent] = useState<CallSessionRowDTO[] | null>(null);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [reloadKey, setReloadKey] = useState(0);

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
  }, [granularity, reloadKey]);

  // Quién pidió que lo llamen en este ciclo (desenlace `callback_requested`).
  const periodStart = overview?.period.start ?? null;
  useEffect(() => {
    if (periodStart === null) return;
    let cancelled = false;
    listCallSessions({ outcome: "callback_requested", from: periodStart, page: 1, page_size: 3 })
      .then((page) => {
        if (cancelled) return;
        const names = page.data
          .map((row) => row.contact?.name?.trim().split(/\s+/).slice(0, 2).join(" "))
          .filter((name): name is string => name !== undefined && name !== "");
        setCallbacks({ total: page.meta.total, names });
      })
      .catch(() => {
        // Sin este dato la isla no puede decir «todo al día»: lo dice.
        if (!cancelled) setCallbacks("error");
      });
    return () => {
      cancelled = true;
    };
  }, [periodStart, reloadKey]);

  // Lo último que terminó; se re-consulta cuando cambia la parrilla en vivo
  // (una llamada que cuelga sale de «en curso» y entra aquí).
  const liveCount = calls.length;
  const loadRecent = useCallback(() => {
    setRecentError(null);
    listCallSessions({ page: 1, page_size: RECENT_ROWS + 4 })
      .then((page) =>
        setRecent(page.data.filter((row) => !isLiveCallStatus(row.status)).slice(0, RECENT_ROWS)),
      )
      .catch((error: unknown) => setRecentError(errorMessage(error)));
  }, []);
  useEffect(() => {
    loadRecent();
  }, [loadRecent, liveCount, reloadKey]);

  // UN intervalo para todos los relojes de las tarjetas en curso.
  useEffect(() => {
    if (calls.length === 0) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [calls.length]);

  const outlook = overview === null ? null : minutesOutlook(overview.minutes, overview.period, now);

  return (
    <div className="flex flex-col gap-6">
      <CallsPageHeader
        kicker="Llamadas · en vivo"
        title="Lo que tu agente logra al teléfono"
        actions={
          canPlace ? (
            <Button className="rounded-full" onClick={() => setDialogOpen(true)}>
              <PhoneOutgoing aria-hidden className="size-4" />
              Llamada de prueba
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <LiveNowTile
          calls={calls}
          initialized={initialized}
          error={liveError}
          onRetry={() => void fetchLive()}
          now={now}
          onTestCall={canPlace ? () => setDialogOpen(true) : null}
          className="lg:col-span-2"
        />

        <NextUpIsland
          unavailable={overviewError !== null || callbacks === "error"}
          onRetry={() => setReloadKey((k) => k + 1)}
          callbacks={callbacks === "error" ? null : callbacks}
          failed={overview?.kpis.failed ?? null}
          minutes={outlook}
          className="lg:col-start-3 lg:row-span-2 lg:row-start-1"
        />

        {overviewError !== null ? (
          <BentoTile label="Este ciclo" className="lg:col-span-2">
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              No pudimos cargar las cifras del ciclo. {overviewError}
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => setReloadKey((k) => k + 1)}>
                <RotateCcw aria-hidden className="size-3.5" /> Reintentar
              </Button>
            </div>
          </BentoTile>
        ) : overview === null ? (
          <Skeleton className="h-[148px] rounded-3xl lg:col-span-2" />
        ) : (
          <CycleTile overview={overview} className="lg:col-span-2" />
        )}

        <BentoTile
          label="Actividad"
          aside={
            <SegmentedControl
              value={granularity}
              onValueChange={(value) => setGranularity(value as CallsOverviewGranularity)}
              label="Ventana del gráfico"
              size="sm"
              surface="inline"
              items={GRANULARITIES}
            />
          }
          className="lg:col-span-2"
        >
          {overviewError !== null ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Sin datos de actividad por ahora.</p>
          ) : overview === null ? (
            <Skeleton className="h-44 w-full rounded-xl" />
          ) : (
            <ActivityChart series={overview.series} granularity={granularity} />
          )}
        </BentoTile>

        {outlook === null ? (
          <Skeleton className="h-full min-h-[220px] rounded-3xl" />
        ) : (
          <MinutesTile outlook={outlook} />
        )}

        <RecentCallsTile rows={recent} error={recentError} onRetry={loadRecent} className="lg:col-span-3" />
      </div>

      <TestCallDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
