"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Phone, PhoneCall, Search, Target, Timer } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { formatDuration } from "@/core/lib/format";
import { usePaginatedList } from "@/shared/api/use-paginated-list";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Progress } from "@/shared/components/ui/progress";
import { DataTable } from "@/shared/components/features/data-table";
import { EmptyState } from "@/shared/components/features/empty-state";
import { TableSkeleton } from "@/shared/components/features/loading";
import { StatTile } from "@/shared/components/features/stat-tile";
import type { CallRow, CallsOverviewDTO } from "@/modules/calls/domain/call";
import { getCallsOverview } from "@/modules/calls/infrastructure/services/calls-service.adapter";
import {
  CallFilters,
  rangeToFromIso,
  type CallFiltersValue,
} from "@/modules/calls/ui/components/CallFilters";
import { callColumns, fetchCalls } from "@/modules/calls/ui/tables/calls.config";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 400;
const REFRESH_DEBOUNCE_MS = 400;

/**
 * Historial de llamadas (`/calls/history`): KPIs del ciclo, filtros y tabla
 * server-side. Molde: el listado de contactos del CRM.
 */
export function CallsHistoryView() {
  const [overview, setOverview] = useState<CallsOverviewDTO | null>(null);
  const [filters, setFilters] = useState<CallFiltersValue>({});
  const [searchDraft, setSearchDraft] = useState("");

  const loadOverview = useCallback(() => {
    getCallsOverview("week")
      .then(setOverview)
      // Sin overview la tabla sigue: los KPIs simplemente no se pintan.
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const extraParams = useMemo(
    () => ({
      direction: filters.direction,
      outcome: filters.outcome,
      ai_agent_id: filters.ai_agent_id,
      from: rangeToFromIso(filters.range),
    }),
    [filters],
  );

  const { items, total, loading, error, page, setPage, setSearch, searchValue, refresh } =
    usePaginatedList<CallRow, "q">({
      fetcher: fetchCalls,
      pageSize: PAGE_SIZE,
      searchField: "q",
      extraParams,
    });

  // El WS avisa, no sincroniza: cualquier evento de llamada re-consulta la
  // página vigente (y los KPIs) con debounce — molde del listado de contactos.
  const { socket } = useSocket("inbox");
  const refreshTimer = useRef<number | null>(null);
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => {
      refreshTimer.current = null;
      void refresh();
      loadOverview();
    }, REFRESH_DEBOUNCE_MS);
  }, [refresh, loadOverview]);
  useEffect(
    () => () => {
      if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current);
    },
    [],
  );
  useSocketEvent(socket, "call.started", scheduleRefresh);
  useSocketEvent(socket, "call.status_changed", scheduleRefresh);
  useSocketEvent(socket, "call.ended", scheduleRefresh);
  // El outcome definitivo llega con el resumen: sin este evento el chip queda
  // en el estado del colgado hasta el siguiente refetch manual.
  useSocketEvent(socket, "call.summary_ready", scheduleRefresh);

  // Búsqueda con debounce (escribir filtra sin Enter, sin spamear al backend).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim() || undefined);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchDraft, setSearch]);

  const hasFilters = Object.values(filters).some((value) => value !== undefined);
  const isEmpty = !loading && total === 0 && !searchValue && !hasFilters;

  const minutes = overview?.minutes ?? null;
  const minutesPct =
    minutes !== null && minutes.limit_seconds !== null && minutes.limit_seconds > 0
      ? Math.min(100, (minutes.used_seconds / minutes.limit_seconds) * 100)
      : null;

  return (
    <div className="space-y-4">
      {overview !== null && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Llamadas este ciclo"
            value={overview.kpis.total}
            icon={PhoneCall}
            hint={`${overview.kpis.outbound} salientes · ${overview.kpis.inbound} entrantes`}
          />
          <StatTile
            label="Minutos usados"
            value={minutes === null ? null : Math.round(minutes.used_seconds / 60)}
            icon={Timer}
            tone={minutesPct !== null && minutesPct >= 80 ? "warning" : "default"}
            hint={
              minutes === null ? undefined : minutes.limit_seconds === null ? (
                "Sin tope configurado"
              ) : (
                <span className="flex items-center gap-2">
                  <Progress value={minutesPct ?? 0} className="h-1.5 w-16" />
                  {`de ${Math.round(minutes.limit_seconds / 60)} min`}
                </span>
              )
            }
          />
          <StatTile
            label="Tasa de conexión"
            value={`${overview.kpis.connection_pct} %`}
            icon={Phone}
            hint={`${overview.kpis.answered} contestadas · ${overview.kpis.no_answer} sin respuesta · ${overview.kpis.voicemail} buzón`}
          />
          <StatTile
            label="Objetivo cumplido"
            value={`${overview.kpis.goal_met_pct} %`}
            icon={Target}
            hint={
              overview.kpis.avg_duration_seconds === null
                ? undefined
                : `duración promedio ${formatDuration(overview.kpis.avg_duration_seconds)}`
            }
          />
        </div>
      )}

      {error ? (
        <div className="border-border bg-background rounded-2xl border p-8 text-center" role="alert">
          <p className="text-muted-foreground text-sm">{errorMessage(error)}</p>
          <Button variant="outline" className="mt-4 rounded-full" onClick={() => void refresh()}>
            Reintentar
          </Button>
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={Phone}
          accent="violet"
          variant="solid"
          title="Aún no hay llamadas"
          description="Cuando tu agente haga o conteste llamadas, quedarán aquí grabadas, transcritas y resumidas."
        />
      ) : (
        <div className="border-border bg-background space-y-4 rounded-2xl border p-4 md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:max-w-xs">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="Buscar por contacto o número…"
                className="h-9 pl-9"
                aria-label="Buscar llamadas"
              />
            </div>
            <CallFilters
              value={filters}
              onChange={(next) => {
                setFilters(next);
                // El hook NO reinicia la página al cambiar extraParams (aviso
                // documentado en LeadsInboxView): se hace a mano.
                setPage(1);
              }}
            />
          </div>

          {loading && items.length === 0 ? (
            <TableSkeleton rows={8} showHeader={false} />
          ) : (
            <DataTable<CallRow>
              data={items}
              columns={callColumns}
              pagination={{ page, pageSize: PAGE_SIZE, total }}
              onPageChange={setPage}
              messages={{ empty: "Sin llamadas para esta búsqueda" }}
            />
          )}

          <p className="text-muted-foreground text-xs">
            Los costos incluyen telefonía y voz a la tarifa vigente; los minutos del plan se
            descuentan por segundo real de llamada.
          </p>
        </div>
      )}
    </div>
  );
}
