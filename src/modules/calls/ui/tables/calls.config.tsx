"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Mic, Route } from "lucide-react";
import type { ListQuery } from "@/shared/api/query";
import type { Paginated } from "@/core/api/types";
import { StatePill } from "@/shared/components/features/bento";
import type { ColumnDef } from "@/shared/components/features/data-table/types";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import {
  callResultPill,
  CALL_PURPOSE_LABELS,
  MODE_LABELS,
  DIRECTION_LABELS,
  mapSessionToRow,
  type CallRow,
  type ListCallSessionsParams,
} from "@/modules/calls/domain/call";
import { callTypeLabel } from "@/modules/calls/domain/playbooks";
import { usePlaybookLabels } from "@/modules/calls/infrastructure/hooks/use-playbook-labels";
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
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
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
            <span className="block truncate font-semibold underline-offset-4 group-hover:underline" title={call.contact_name ?? undefined}>
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
    header: "Motivo",
    searchable: false,
    cell: ({ row }) => (
      <span className="flex flex-col whitespace-nowrap">
        <span className="text-sm">
          {row.original.mode === "proactive" && row.original.call_type !== null
            ? callTypeLabel(row.original.call_type)
            : CALL_PURPOSE_LABELS[row.original.purpose]}
        </span>
        <span className="text-xs text-muted-foreground">
          {MODE_LABELS[row.original.mode].toLowerCase()}
          {row.original.attempt > 1 ? ` · intento ${row.original.attempt}` : ""}
        </span>
        {row.original.mode === "proactive" && row.original.last_stage !== null && (
          <StageReached callType={row.original.call_type} stageKey={row.original.last_stage} />
        )}
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
          <Mic className="size-3" aria-label="Con grabación" />
        ) : null}
      </span>
    ),
  },
  {
    accessorKey: "outcome",
    header: "Resultado",
    searchable: false,
    cell: ({ row }) => {
      const result = callResultPill(row.original);
      return <StatePill tone={result.tone}>{result.label}</StatePill>;
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

/** «Llegó a Propuesta»: el nombre que el negocio le puso a la etapa en Marcos. */
function StageReached({ callType, stageKey }: { callType: string | null; stageKey: string }) {
  const labels = usePlaybookLabels();
  const label = (callType === null ? undefined : labels.get(callType)?.get(stageKey)) ?? stageKey;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Route aria-hidden className="size-3 text-accent-violet" />
      llegó a {label.toLowerCase()}
    </span>
  );
}

