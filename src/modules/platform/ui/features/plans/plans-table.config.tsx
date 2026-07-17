/**
 * Columnas del catálogo de planes. El `DataTable` exige filas de valores
 * primitivos → `PlanRow` aplana el plan (el set de límites queda como
 * conteo); las acciones resuelven el plan completo vía `getPlan`.
 */
import { cn } from "@/core/lib/utils";
import type { ColumnDef } from "@/shared/components/features/data-table";
import { Badge } from "@/shared/components/ui/badge";
import type { PlanListItem, PlanTier } from "../../../domain/plan";
import { RelativeDate } from "../../components/RelativeDate";
import { StatusBadge } from "../../components/StatusBadge";
import { PlanRowActions } from "./PlanRowActions";

/** Fila plana para la tabla (solo primitivos — contrato del DataTable). */
export type PlanRow = {
  id: string;
  code: string;
  name: string;
  tier: PlanTier;
  limits_count: number;
  subscriptions_count: number;
  is_active: boolean;
  updated_at: string;
};

export function toPlanRow(plan: PlanListItem): PlanRow {
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    tier: plan.tier,
    limits_count: plan.default_limits.length,
    subscriptions_count: plan.subscriptions_count,
    is_active: plan.is_active,
    updated_at: plan.updated_at,
  };
}

export function buildPlanColumns(handlers: {
  onEdit: (plan: PlanListItem) => void;
  getPlan: (id: string) => PlanListItem | undefined;
}): ColumnDef<PlanRow>[] {
  return [
    {
      accessorKey: "code",
      header: "Código",
      sortable: true,
      minWidth: 130,
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
    },
    {
      accessorKey: "name",
      header: "Nombre",
      sortable: true,
      minWidth: 180,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "tier",
      header: "Tier",
      sortable: true,
      minWidth: 120,
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn(
            row.original.tier === "enterprise"
              ? "border-accent-violet/40 bg-accent-violet/10 text-accent-violet"
              : "border-border text-muted-foreground",
          )}
        >
          {row.original.tier}
        </Badge>
      ),
    },
    {
      accessorKey: "limits_count",
      header: "Límites",
      sortable: true,
      minWidth: 90,
      cell: ({ row }) => <span className="tabular-nums">{row.original.limits_count}</span>,
    },
    {
      accessorKey: "subscriptions_count",
      header: "Suscritos",
      sortable: true,
      minWidth: 100,
      cell: ({ row }) => <span className="tabular-nums">{row.original.subscriptions_count}</span>,
    },
    {
      id: "status",
      header: "Estado",
      alwaysVisible: true,
      minWidth: 120,
      cell: ({ row }) => <StatusBadge status={row.original.is_active ? "active" : "disabled"} />,
    },
    {
      accessorKey: "updated_at",
      header: "Actualizado",
      sortable: true,
      minWidth: 120,
      cell: ({ row }) => <RelativeDate iso={row.original.updated_at} className="text-muted-foreground" />,
    },
    {
      id: "actions",
      alwaysVisible: true,
      minWidth: 56,
      cell: ({ row }) => {
        const plan = handlers.getPlan(row.original.id);
        if (!plan) return null;
        return <PlanRowActions plan={plan} onEdit={handlers.onEdit} />;
      },
    },
  ];
}
