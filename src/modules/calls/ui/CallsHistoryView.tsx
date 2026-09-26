"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Phone, Search } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { formatDuration } from "@/core/lib/format";
import { usePaginatedList } from "@/shared/api/use-paginated-list";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { DataTable } from "@/shared/components/features/data-table";
import { EmptyState } from "@/shared/components/features/empty-state";
import { TableSkeleton } from "@/shared/components/features/loading";
import { BentoFigure, BentoTile } from "@/shared/components/features/bento";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  CALL_OUTCOME_MAP,
  type CallOutcome,
  type CallRow,
  type CallsOverviewDTO,
} from "@/modules/calls/domain/call";
import { getCallsOverview } from "@/modules/calls/infrastructure/services/calls-service.adapter";
import {
  CallFilters,
  rangeToFromIso,
  type CallFiltersValue,
} from "@/modules/calls/ui/components/CallFilters";
import { CallsPageHeader } from "@/modules/calls/ui/components/CallsPageHeader";
import { callColumns, fetchCalls } from "@/modules/calls/ui/tables/calls.config";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 400;
const REFRESH_DEBOUNCE_MS = 400;

/** `?outcome=` válido del contrato (la isla del Monitoreo enlaza aquí filtrado). */
function outcomeFromQuery(raw: string | null): CallOutcome | undefined {
  return raw !== null && raw in CALL_OUTCOME_MAP ? (raw as CallOutcome) : undefined;
}

/**
 * Historial de llamadas (`/calls/history`, llamadas premium F5, canvas
 * tablero 7): cifras del ciclo en fichas, filtros y la tabla server-side.
 * Molde: el listado de contactos del CRM. `?outcome=` llega ya filtrado.
 */
export function CallsHistoryView() {
  const searchParams = useSearchParams();
  const [overview, setOverview] = useState<CallsOverviewDTO | null>(null);
  const [overviewFailed, setOverviewFailed] = useState(false);
  const [filters, setFilters] = useState<CallFiltersValue>(() => ({
    outcome: outcomeFromQuery(searchParams.get("outcome")),
  }));
  const [searchDraft, setSearchDraft] = useState("");

  const loadOverview = useCallback(() => {
    getCallsOverview("week")
      .then((data) => {
        setOverview(data);
        setOverviewFailed(false);
      })
      // Sin overview la tabla sigue: las fichas simplemente no se pintan.
      .catch(() => setOverviewFailed(true));
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
    <div className="flex flex-col gap-6">
      <CallsPageHeader kicker="Llamadas · historial" title="Cada llamada, con su resultado" />

      {overviewFailed && overview === null ? null : overview === null ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-[132px] rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <BentoTile label="Llamadas este ciclo">
            <BentoFigure value={String(overview.kpis.total)} unit="llamadas" />
            <p className="truncate text-xs text-muted-foreground">
              {overview.kpis.outbound} salen · {overview.kpis.inbound} entran
            </p>
          </BentoTile>
          <BentoTile label="Minutos del ciclo">
            <BentoFigure
              value={String(minutes === null ? 0 : Math.round(minutes.used_seconds / 60))}
              unit={minutes?.limit_seconds == null ? "min · sin tope" : `de ${Math.round(minutes.limit_seconds / 60)} min`}
            />
            {minutesPct !== null && (
              <div
                className="h-1.5 overflow-hidden rounded-full bg-muted"
                role="meter"
                aria-label="Minutos usados del ciclo"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(minutesPct)}
              >
                <div
                  className={minutesPct >= 80 ? "h-full rounded-full bg-warning" : "h-full rounded-full bg-foreground"}
                  style={{ width: `${minutesPct}%` }}
                />
              </div>
            )}
          </BentoTile>
          <BentoTile label="Contestaron">
            <BentoFigure value={`${overview.kpis.connection_pct} %`} />
            <p className="truncate text-xs text-muted-foreground">
              {overview.kpis.answered} sí · {overview.kpis.no_answer} no · {overview.kpis.voicemail} buzón
            </p>
          </BentoTile>
          <BentoTile label="Objetivo cumplido">
            <BentoFigure value={`${overview.kpis.goal_met_pct} %`} />
            <p className="truncate text-xs text-muted-foreground">
              {overview.kpis.goal_met} llamadas
              {overview.kpis.avg_duration_seconds === null
                ? ""
                : ` · ${formatDuration(overview.kpis.avg_duration_seconds)} de media`}
            </p>
          </BentoTile>
        </div>
      )}

      {error ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-center" role="alert">
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
        <section aria-label="Llamadas" className="space-y-4 rounded-3xl border border-border bg-card p-4 md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:max-w-xs">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="Buscar por contacto o número…"
                className="h-9 rounded-full pl-9"
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
        </section>
      )}
    </div>
  );
}
