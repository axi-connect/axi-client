"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, Search, Sparkles } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { formatMoney, formatShortDate } from "@/core/lib/format";
import { usePaginatedList } from "@/shared/api/use-paginated-list";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { DataTable, type ColumnDef } from "@/shared/components/features/data-table";
import { TableSkeleton } from "@/shared/components/features/loading";
import {
  DEAL_STATUS_LABELS,
  type DealDTO,
  type DealStatus,
  type ListDealsParams,
} from "@/modules/crm/domain/deal";
import { listDeals } from "@/modules/crm/infrastructure/services/deals-service.adapter";
import { useBoardStore } from "@/modules/crm/infrastructure/stores/board.store";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 400;

/** Fila plana para DataTable (valores primitivos). */
type DealTableRow = {
  id: string;
  title: string;
  by_ai: boolean;
  contact_name: string;
  stage_name: string;
  stage_color: string | null;
  value_cents: number | null;
  currency: string;
  expected_close_date: string | null;
  status: DealStatus;
};

function toTableRow(deal: DealDTO): DealTableRow {
  return {
    id: deal.id,
    title: deal.title,
    by_ai: deal.source === "ai_conversation",
    contact_name: deal.contact.full_name ?? deal.contact.phone ?? "Sin contacto",
    stage_name: deal.stage.name,
    stage_color: deal.stage.color,
    value_cents: deal.value_cents,
    currency: deal.currency,
    expected_close_date: deal.expected_close_date,
    status: deal.status,
  };
}

const STATUS_BADGE_CLASSES: Record<DealStatus, string> = {
  open: "border-transparent bg-info/12 text-info",
  won: "border-transparent bg-success/12 text-success",
  lost: "border-transparent bg-destructive/12 text-destructive",
};

const STATUS_FILTERS: Array<{ value: DealStatus | "all"; label: string }> = [
  { value: "open", label: "Abiertas" },
  { value: "won", label: "Ganadas" },
  { value: "lost", label: "Perdidas" },
  { value: "all", label: "Todas" },
];

/**
 * Vista tabla del pipeline: comparte contrato con el board (`GET /crm/deals` +
 * `usePaginatedList`, sin segundo store). Won/lost SOLO existen aquí como
 * badges/filtros. El chip "N nuevos" (realtimeVersion del board.store) evita
 * re-paginar bajo los pies del usuario cuando llegan eventos WS.
 */
export function DealsTable({ onOpenDeal }: { onOpenDeal: (dealId: string) => void }) {
  const pipelineId = useBoardStore((s) => s.pipelineId);
  const realtimeVersion = useBoardStore((s) => s.realtimeVersion);

  const [status, setStatus] = useState<DealStatus | "all">("open");
  const [searchDraft, setSearchDraft] = useState("");
  const seenVersion = useRef(realtimeVersion);
  const [pendingEvents, setPendingEvents] = useState(0);

  const extraParams = useMemo<ListDealsParams>(
    () => ({
      pipeline_id: pipelineId ?? undefined,
      status: status === "all" ? undefined : status,
    }),
    [pipelineId, status],
  );

  const { items, total, loading, error, page, setPage, setSearch, refresh } = usePaginatedList<
    DealDTO,
    "q"
  >({
    fetcher: listDeals,
    pageSize: PAGE_SIZE,
    searchField: "q",
    extraParams,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchDraft.trim() || undefined), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchDraft, setSearch]);

  // Eventos WS mientras la tabla está montada → chip, nunca re-fetch implícito.
  useEffect(() => {
    if (realtimeVersion > seenVersion.current) {
      setPendingEvents(realtimeVersion - seenVersion.current);
    }
  }, [realtimeVersion]);

  const applyPending = () => {
    seenVersion.current = realtimeVersion;
    setPendingEvents(0);
    void refresh();
  };

  const columns = useMemo<ColumnDef<DealTableRow>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Oportunidad",
        alwaysVisible: true,
        minWidth: 200,
        cell: ({ row }) => (
          <button
            type="button"
            className="group flex min-w-0 items-center gap-1.5 text-left"
            onClick={() => onOpenDeal(row.original.id)}
          >
            <span className="truncate font-medium transition-colors group-hover:text-brand">
              {row.original.title}
            </span>
            {row.original.by_ai && (
              <Sparkles className="size-3.5 shrink-0 text-accent-violet" aria-label="Creada por IA" />
            )}
          </button>
        ),
      },
      { accessorKey: "contact_name", header: "Contacto", minWidth: 140 },
      {
        accessorKey: "stage_name",
        header: "Etapa",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className="border-border"
            style={
              row.original.stage_color
                ? { borderColor: row.original.stage_color, color: row.original.stage_color }
                : undefined
            }
          >
            {row.original.stage_name}
          </Badge>
        ),
      },
      {
        accessorKey: "value_cents",
        header: "Valor",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.value_cents !== null
              ? formatMoney(row.original.value_cents, row.original.currency)
              : "—"}
          </span>
        ),
      },
      {
        accessorKey: "expected_close_date",
        header: "Cierre esp.",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {row.original.expected_close_date !== null
              ? formatShortDate(row.original.expected_close_date)
              : "—"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Estado",
        alwaysVisible: true,
        cell: ({ row }) => (
          <Badge variant="outline" className={cn(STATUS_BADGE_CLASSES[row.original.status])}>
            {DEAL_STATUS_LABELS[row.original.status]}
          </Badge>
        ),
      },
    ],
    [onOpenDeal],
  );

  const rows = useMemo(() => items.map(toTableRow), [items]);

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-background p-8 text-center">
        <p className="text-sm text-muted-foreground">{errorMessage(error)}</p>
        <Button variant="outline" className="mt-4 rounded-full" onClick={() => void refresh()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Buscar oportunidades…"
            className="h-9 pl-9"
            aria-label="Buscar oportunidades"
          />
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Filtrar por estado">
          {STATUS_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={status === option.value}
              onClick={() => setStatus(option.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                status === option.value
                  ? "border-primary/40 bg-accent text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {pendingEvents > 0 && (
          <Button variant="secondary" size="sm" className="rounded-full" onClick={applyPending}>
            <RefreshCw className="size-3.5" />
            {pendingEvents} {pendingEvents === 1 ? "cambio nuevo" : "cambios nuevos"}
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-border bg-background p-4">
        {loading && rows.length === 0 ? (
          <TableSkeleton rows={8} showHeader={false} />
        ) : (
          <DataTable<DealTableRow>
            data={rows}
            columns={columns}
            pagination={{ page, pageSize: PAGE_SIZE, total }}
            onPageChange={setPage}
            messages={{ empty: "Sin oportunidades para este filtro" }}
          />
        )}
      </div>
    </div>
  );
}
