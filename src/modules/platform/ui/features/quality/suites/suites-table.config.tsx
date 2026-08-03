/**
 * Columnas del catálogo de suites (filas planas, contrato del DataTable).
 * Lista con paginación/búsqueda EN SERVER → sin `sortable`.
 */
import type { ColumnDef } from "@/shared/components/features/data-table";
import { Badge } from "@/shared/components/ui/badge";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import type { SuiteListItem } from "../../../../domain/quality";
import { StatusBadge } from "../../../components/StatusBadge";
import { SuiteRowActions } from "./SuiteRowActions";

/** Fila plana para la tabla. */
export type SuiteRow = {
  id: string;
  code: string;
  name: string;
  scenarios_count: number;
  is_system: boolean;
  status: string;
  updated_at: string;
};

export function toSuiteRow(suite: SuiteListItem): SuiteRow {
  return {
    id: suite.id,
    code: suite.code,
    name: suite.name,
    scenarios_count: suite.scenarios_count,
    is_system: suite.is_system,
    status: suite.status,
    updated_at: suite.updated_at,
  };
}

export function buildSuiteColumns(handlers: {
  getSuite: (id: string) => SuiteListItem | undefined;
  onEdit: (suite: SuiteListItem) => void;
  onManageScenarios: (suite: SuiteListItem) => void;
}): ColumnDef<SuiteRow>[] {
  return [
    {
      accessorKey: "code",
      header: "Código",
      minWidth: 150,
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
    },
    {
      accessorKey: "name",
      header: "Nombre",
      minWidth: 190,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "scenarios_count",
      header: "Escenarios",
      searchable: false,
      minWidth: 100,
      cell: ({ row }) => <span className="tabular-nums">{row.original.scenarios_count}</span>,
    },
    {
      accessorKey: "is_system",
      header: "Origen",
      searchable: false,
      minWidth: 100,
      cell: ({ row }) =>
        row.original.is_system ? (
          <Badge variant="outline" className="border-accent-violet/40 bg-accent-violet/10 text-accent-violet">
            Sistema
          </Badge>
        ) : (
          <Badge variant="outline" className="border-border text-muted-foreground">
            Propio
          </Badge>
        ),
    },
    {
      accessorKey: "status",
      header: "Estado",
      searchable: false,
      alwaysVisible: true,
      minWidth: 110,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "updated_at",
      header: "Actualizada",
      searchable: false,
      minWidth: 120,
      cell: ({ row }) => <RelativeDate iso={row.original.updated_at} className="text-muted-foreground" />,
    },
    {
      id: "actions",
      alwaysVisible: true,
      minWidth: 56,
      cell: ({ row }) => {
        const suite = handlers.getSuite(row.original.id);
        if (!suite) return null;
        return (
          <SuiteRowActions
            suite={suite}
            onEdit={handlers.onEdit}
            onManageScenarios={handlers.onManageScenarios}
          />
        );
      },
    },
  ];
}
