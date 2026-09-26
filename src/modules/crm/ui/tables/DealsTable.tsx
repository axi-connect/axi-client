"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, RotateCcw, Search, Sparkles } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { formatMoney } from "@/core/lib/format";
import { usePaginatedList } from "@/shared/api/use-paginated-list";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { DataTable, type ColumnDef } from "@/shared/components/features/data-table";
import { TableSkeleton } from "@/shared/components/features/loading";
import { StatePill, type StatePillTone } from "@/shared/components/features/bento";
import { Avatar } from "@/shared/components/ui/avatar";
import { type DealDTO, type DealStatus, type ListDealsParams } from "@/modules/crm/domain/deal";
import { daysInStage } from "@/modules/crm/domain/deal-state";
import { daysLabel, formatCloseDate, stallInfo, weightedCents } from "@/modules/crm/domain/pipeline-summary";
import { useActiveStages } from "@/modules/crm/infrastructure/hooks/use-active-stages";
import { listDeals } from "@/modules/crm/infrastructure/services/deals-service.adapter";
import { getTenantUserNames } from "@/modules/crm/infrastructure/services/tenant-users.cache";
import { useBoardStore } from "@/modules/crm/infrastructure/stores/board.store";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 400;

/** Fila plana para DataTable (valores primitivos). */
type DealTableRow = {
  id: string;
  title: string;
  by_ai: boolean;
  contact_name: string;
  avatar_url: string | null;
  stage_name: string;
  stage_color: string | null;
  probability_pct: number;
  value_cents: number | null;
  weighted_cents: number;
  currency: string;
  expected_close_date: string | null;
  status: DealStatus;
  days_in_stage: number;
  stall_limit: number | null;
  owner_name: string | null;
};

const STATUS_TONE: Record<DealStatus, StatePillTone> = { open: "neutral", won: "success", lost: "destructive" };
const STATUS_TEXT: Record<DealStatus, string> = { open: "Abierta", won: "Ganada", lost: "Perdida" };

const STATUS_FILTERS: Array<{ value: DealStatus | "all"; label: string }> = [
  { value: "open", label: "Abiertas" },
  { value: "won", label: "Ganadas" },
  { value: "lost", label: "Perdidas" },
  { value: "all", label: "Todas" },
];

/**
 * Vista tabla del pipeline (lienzo CRM premium F1, tablero 7): las mismas
 * señales del tablero, en filas —etapa con su punto, lo que pondera, cuánto
 * lleva quieta—. Comparte contrato con el board (`GET /crm/deals` +
 * `usePaginatedList`, sin segundo store). El chip «N cambios nuevos» evita
 * re-paginar bajo los pies del usuario cuando llegan eventos WS.
 *
 * Nada se desborda: cada celda de texto trunca con `title`, y a poco ancho
 * `DataTable` baja las columnas secundarias a su «Ver más» en vez de partir
 * una celda. La tarjeta tiene un solo scroller vertical, con la barra de Axi.
 */
export function DealsTable({ onOpenDeal }: { onOpenDeal: (dealId: string) => void }) {
  const pipelineId = useBoardStore((s) => s.pipelineId);
  const realtimeVersion = useBoardStore((s) => s.realtimeVersion);
  const stages = useActiveStages();

  const [status, setStatus] = useState<DealStatus | "all">("open");
  const [searchDraft, setSearchDraft] = useState("");
  const [ownerNames, setOwnerNames] = useState<Map<string, string>>(new Map());
  const seenVersion = useRef(realtimeVersion);
  const [pendingEvents, setPendingEvents] = useState(0);

  useEffect(() => {
    void getTenantUserNames().then(setOwnerNames);
  }, []);

  const extraParams = useMemo<ListDealsParams>(
    () => ({
      pipeline_id: pipelineId ?? undefined,
      status: status === "all" ? undefined : status,
    }),
    [pipelineId, status],
  );

  const { items, total, loading, error, page, setPage, setSearch, refresh } = usePaginatedList<DealDTO, "q">({
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

  const columns = useMemo<ColumnDef<DealTableRow>[]>(() => {
    const defs: ColumnDef<DealTableRow>[] = [
      {
        accessorKey: "title",
        header: "Oportunidad",
        alwaysVisible: true,
        minWidth: 240,
        cellClassName: "max-w-[22rem]",
        cell: ({ row }) => (
          <button
            type="button"
            className="group flex w-full max-w-[20rem] min-w-0 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            onClick={() => onOpenDeal(row.original.id)}
          >
            <Avatar src={row.original.avatar_url} alt="" fallback={row.original.contact_name} size={28} />
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate font-semibold underline-offset-4 group-hover:underline" title={row.original.title}>
                  {row.original.title}
                </span>
                {row.original.by_ai && (
                  <Sparkles className="size-3.5 shrink-0 text-accent-violet" role="img" aria-label="La abrió Axi" />
                )}
              </span>
              <span className="block truncate text-xs text-muted-foreground" title={row.original.contact_name}>
                {row.original.contact_name}
              </span>
            </span>
          </button>
        ),
      },
      {
        accessorKey: "stage_name",
        header: "Etapa",
        minWidth: 150,
        cell: ({ row }) => (
          <span className="inline-flex max-w-[12rem] min-w-0 items-center gap-2 whitespace-nowrap">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full bg-muted-foreground"
              style={row.original.stage_color ? { backgroundColor: row.original.stage_color } : undefined}
            />
            <span className="truncate" title={row.original.stage_name}>
              {row.original.stage_name}
            </span>
            <span className="shrink-0 text-muted-foreground tabular-nums">{row.original.probability_pct} %</span>
          </span>
        ),
      },
      {
        accessorKey: "value_cents",
        header: "Valor",
        minWidth: 130,
        headClassName: "text-right",
        cellClassName: "text-right",
        cell: ({ row }) => (
          <span className="font-semibold whitespace-nowrap tabular-nums">
            {row.original.value_cents !== null ? formatMoney(row.original.value_cents, row.original.currency) : (
              <span className="font-normal text-muted-foreground">Sin valor</span>
            )}
          </span>
        ),
      },
    ];

    if (status === "open") {
      defs.push({
        accessorKey: "weighted_cents",
        header: "Pondera",
        minWidth: 120,
        headClassName: "text-right",
        cellClassName: "text-right",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground tabular-nums">
            {row.original.value_cents !== null ? formatMoney(row.original.weighted_cents, row.original.currency) : "No suma"}
          </span>
        ),
      });
    }

    defs.push({
      accessorKey: "expected_close_date",
      header: "Cierre esperado",
      minWidth: 130,
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums">
          {row.original.expected_close_date !== null ? (
            formatCloseDate(row.original.expected_close_date, true)
          ) : (
            <span className="text-muted-foreground">Sin fecha</span>
          )}
        </span>
      ),
    });

    if (status === "open") {
      defs.push({
        accessorKey: "days_in_stage",
        header: "En la etapa",
        minWidth: 170,
        cell: ({ row }) =>
          row.original.stall_limit !== null ? (
            <StatePill tone="warning">
              {daysLabel(row.original.days_in_stage)} · aguanta {row.original.stall_limit}
            </StatePill>
          ) : (
            <span className="whitespace-nowrap text-muted-foreground">
              {row.original.days_in_stage === 0 ? "Entró hoy" : daysLabel(row.original.days_in_stage)}
            </span>
          ),
      });
    } else {
      defs.push({
        accessorKey: "status",
        header: "Estado",
        minWidth: 110,
        cell: ({ row }) => <StatePill tone={STATUS_TONE[row.original.status]}>{STATUS_TEXT[row.original.status]}</StatePill>,
      });
    }

    defs.push({
      accessorKey: "owner_name",
      header: "Responsable",
      minWidth: 150,
      cell: ({ row }) => (
        <span className="block max-w-[11rem] truncate" title={row.original.owner_name ?? undefined}>
          {row.original.owner_name ?? <span className="text-muted-foreground">Sin responsable</span>}
        </span>
      ),
    });

    return defs;
  }, [onOpenDeal, status]);

  const rows = useMemo<DealTableRow[]>(() => {
    const rotting = new Map(stages.map((stage) => [stage.id, stage.rotting_days]));
    return items.map((deal) => {
      const stall = stallInfo(deal, rotting.get(deal.stage_id));
      return {
        id: deal.id,
        title: deal.title,
        by_ai: deal.source === "ai_conversation",
        contact_name: deal.contact.full_name ?? deal.contact.phone ?? "Sin contacto",
        avatar_url: deal.contact.avatar_url,
        stage_name: deal.stage.name,
        stage_color: deal.stage.color,
        probability_pct: deal.stage.probability_pct,
        value_cents: deal.value_cents,
        weighted_cents: weightedCents(deal.value_cents, deal.stage.probability_pct),
        currency: deal.currency,
        expected_close_date: deal.expected_close_date,
        status: deal.status,
        days_in_stage: daysInStage(deal.stage_entered_at),
        stall_limit: stall?.limit ?? null,
        owner_name: deal.owner_user_id !== null ? (ownerNames.get(deal.owner_user_id) ?? null) : null,
      };
    });
  }, [items, stages, ownerNames]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="relative w-full min-w-0 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Buscar por nombre de la oportunidad"
            className="h-10 rounded-full bg-card pl-10"
            aria-label="Buscar oportunidades"
          />
        </div>
        <div className="flex max-w-full min-w-0 items-center gap-2">
          {pendingEvents > 0 && (
            <Button variant="outline" size="sm" className="shrink-0 rounded-full" onClick={applyPending}>
              <RefreshCw className="size-3.5" aria-hidden="true" />
              {pendingEvents} {pendingEvents === 1 ? "cambio nuevo" : "cambios nuevos"}
            </Button>
          )}
          <SegmentedControl value={status} onValueChange={setStatus} label="Estado de las oportunidades" items={STATUS_FILTERS} />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-card">
        {error ? (
          <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="max-w-sm space-y-1.5">
              <p className="font-heading text-xl font-bold">No pudimos leer las oportunidades</p>
              <p className="text-sm text-pretty text-muted-foreground">{errorMessage(error)}</p>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => void refresh()}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Reintentar
            </Button>
          </div>
        ) : (
          <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 sm:p-3">
            {loading && rows.length === 0 ? (
              <TableSkeleton rows={8} showHeader={false} />
            ) : (
              <DataTable<DealTableRow>
                data={rows}
                columns={columns}
                pagination={{ page, pageSize: PAGE_SIZE, total }}
                onPageChange={setPage}
                messages={{
                  empty: searchDraft.trim() !== "" ? `Nada coincide con «${searchDraft.trim()}»` : "Nada en este filtro todavía",
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
