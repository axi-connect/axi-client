"use client";

import type { ColumnDef } from "@/shared/components/features/data-table";
import { formatMoney } from "@/core/lib/format";
import { StatusBadge } from "@/shared/components/features/status-badge";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import type { CallNumberRow } from "../../../domain/call-provisioning";
import { NumberRowActions } from "./NumberRowActions";

const NUMBER_STATUS_MAP = {
  active: { label: "Activo", tone: "success" as const },
  released: { label: "Liberado", tone: "neutral" as const },
};

export const callNumberColumns: ColumnDef<CallNumberRow>[] = [
  {
    accessorKey: "phone_number",
    header: "Número",
    sortable: true,
    minWidth: 170,
    cell: ({ row }) => (
      <span className="font-mono text-xs font-medium tabular-nums">
        {row.original.phone_number}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Estado",
    sortable: true,
    searchable: false,
    minWidth: 110,
    cell: ({ row }) => <StatusBadge status={row.original.status} map={NUMBER_STATUS_MAP} />,
  },
  {
    accessorKey: "company_name",
    header: "Tenant",
    sortable: true,
    minWidth: 160,
    cell: ({ row }) =>
      row.original.company_name === null ? (
        <span className="text-muted-foreground text-xs">En stock</span>
      ) : (
        <span className="text-sm">{row.original.company_name}</span>
      ),
  },
  {
    accessorKey: "default_ai_agent_name",
    header: "Contesta",
    searchable: false,
    minWidth: 130,
    cell: ({ row }) => (
      <span className="text-sm">{row.original.default_ai_agent_name ?? "—"}</span>
    ),
  },
  {
    accessorKey: "inbound_enabled",
    header: "Entrantes",
    searchable: false,
    minWidth: 100,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {row.original.inbound_enabled ? "Sí" : "No"}
      </span>
    ),
  },
  {
    accessorKey: "monthly_cost_cents",
    header: "Renta mensual",
    sortable: true,
    searchable: false,
    minWidth: 120,
    cell: ({ row }) => (
      <span className="text-muted-foreground font-mono text-xs tabular-nums">
        {row.original.monthly_cost_cents === null
          ? "—"
          : formatMoney(row.original.monthly_cost_cents, "USD")}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Comprado",
    sortable: true,
    searchable: false,
    minWidth: 110,
    cell: ({ row }) => (
      <RelativeDate iso={row.original.created_at} className="text-muted-foreground" />
    ),
  },
  {
    id: "actions",
    alwaysVisible: true,
    minWidth: 56,
    cell: ({ row }) => <NumberRowActions number={row.original} />,
  },
];
