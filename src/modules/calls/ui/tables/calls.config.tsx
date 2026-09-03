"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Mic } from "lucide-react";
import type { ListQuery } from "@/shared/api/query";
import type { Paginated } from "@/core/api/types";
import { cn } from "@/core/lib/utils";
import { StatusBadge } from "@/shared/components/features/status-badge";
import type { ColumnDef } from "@/shared/components/features/data-table/types";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import {
  callResultBadge,
  CALL_PURPOSE_LABELS,
  DIRECTION_LABELS,
  mapSessionToRow,
  type CallRow,
  type ListCallSessionsParams,
} from "@/modules/calls/domain/call";
import { listCallSessions } from "@/modules/calls/infrastructure/services/calls-service.adapter";
import { formatCallClock, formatCallCost } from "@/modules/calls/ui/lib/call-format";

export async function fetchCalls(params: ListQuery): Promise<Paginated<CallRow>> {
  const page = await listCallSessions(params as ListCallSessionsParams);
  return { ...page, data: page.data.map(mapSessionToRow) };
}

export const callColumns: ColumnDef<CallRow>[] = [
  {
    accessorKey: "contact_name",
    header: "Contacto",
    minWidth: 220,
    alwaysVisible: true,
    cell: ({ row }) => {
      const call = row.original;
      const outbound = call.direction === "outbound";
      return (
        <Link href={`/calls/${call.id}`} className="group flex items-center gap-3 py-0.5">
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full border",
              outbound
                ? "border-accent-violet/40 bg-accent-violet/10 text-accent-violet"
                : "border-info/40 bg-info/10 text-info",
            )}
            title={DIRECTION_LABELS[call.direction]}
          >
            {outbound ? (
              <ArrowUpRight className="size-3.5" aria-hidden />
            ) : (
              <ArrowDownLeft className="size-3.5" aria-hidden />
            )}
            <span className="sr-only">{DIRECTION_LABELS[call.direction]}</span>
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium transition-colors group-hover:text-brand">
              {call.contact_name ?? "Sin contacto"}
            </span>
            <span className="text-muted-foreground block truncate font-mono text-xs">
              {call.phone}
            </span>
          </span>
        </Link>
      );
    },
  },
  {
    accessorKey: "purpose",
    header: "Propósito",
    searchable: false,
    cell: ({ row }) => (
      <span className="border-border text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs whitespace-nowrap">
        {CALL_PURPOSE_LABELS[row.original.purpose]}
        {row.original.attempt > 1 ? ` · intento ${row.original.attempt}` : ""}
      </span>
    ),
  },
  {
    accessorKey: "agent",
    header: "Agente",
    searchable: false,
    cell: ({ row }) => <span className="whitespace-nowrap">{row.original.agent ?? "—"}</span>,
  },
  {
    accessorKey: "duration_seconds",
    header: "Duración",
    searchable: false,
    cell: ({ row }) => (
      <span className="text-muted-foreground inline-flex items-center gap-1.5 font-mono text-xs tabular-nums">
        {row.original.duration_seconds === null
          ? "—"
          : formatCallClock(row.original.duration_seconds)}
        {row.original.has_recording ? (
          <Mic className="text-accent-violet size-3" aria-label="Con grabación" />
        ) : null}
      </span>
    ),
  },
  {
    accessorKey: "outcome",
    header: "Resultado",
    searchable: false,
    cell: ({ row }) => {
      const badge = callResultBadge(row.original);
      return <StatusBadge status={badge.status} map={badge.map} />;
    },
  },
  {
    accessorKey: "cost_estimate_usd",
    header: "Costo",
    searchable: false,
    cell: ({ row }) => (
      <span className="text-muted-foreground font-mono text-xs tabular-nums">
        {formatCallCost(row.original.cost_estimate_usd)}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Cuándo",
    searchable: false,
    cell: ({ row }) => (
      <RelativeDate iso={row.original.created_at} className="text-muted-foreground text-xs" />
    ),
  },
];
