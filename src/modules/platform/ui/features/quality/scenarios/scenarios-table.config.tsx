/**
 * Columnas del catálogo de escenarios. El `DataTable` exige filas de valores
 * primitivos → `ScenarioRow` aplana (criterios como conteo, tags unidas);
 * las acciones resuelven el escenario completo vía `getScenario`. La lista
 * pagina/busca EN SERVER: sin `sortable` (ordenar solo la página engañaría).
 */
import type { ColumnDef } from "@/shared/components/features/data-table";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import type { Scenario, ScenarioListItem } from "../../../../domain/quality";
import { OriginPill, QualityStatus, TagChips } from "../shared/premium";
import { ScenarioRowActions } from "./ScenarioRowActions";

/** Fila plana para la tabla (solo primitivos — contrato del DataTable). */
export type ScenarioRow = {
  id: string;
  code: string;
  name: string;
  criteria_count: number;
  /** Tags unidas por ", " (el DataTable exige primitivos); la celda las parte. */
  tags: string;
  is_system: boolean;
  status: string;
  updated_at: string;
};

export function toScenarioRow(scenario: ScenarioListItem): ScenarioRow {
  return {
    id: scenario.id,
    code: scenario.code,
    name: scenario.name,
    criteria_count: scenario.success_criteria.length,
    tags: scenario.tags.join(", "),
    is_system: scenario.is_system,
    status: scenario.status,
    updated_at: scenario.updated_at,
  };
}

export function buildScenarioColumns(handlers: {
  getScenario: (id: string) => Scenario | undefined;
  onView: (scenario: Scenario) => void;
  onEdit: (scenario: Scenario) => void;
  onClone: (scenario: Scenario) => void;
}): ColumnDef<ScenarioRow>[] {
  return [
    {
      accessorKey: "code",
      header: "Código",
      minWidth: 170,
      cell: ({ row }) => <span className="font-mono text-xs whitespace-nowrap">{row.original.code}</span>,
    },
    {
      accessorKey: "name",
      header: "Nombre",
      minWidth: 190,
      cell: ({ row }) => (
        <span className="block max-w-64 truncate font-medium" title={row.original.name}>
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: "criteria_count",
      header: "Criterios",
      searchable: false,
      minWidth: 90,
      cell: ({ row }) => <span className="tabular-nums">{row.original.criteria_count}</span>,
    },
    {
      accessorKey: "tags",
      header: "Etiquetas",
      searchable: false,
      minWidth: 200,
      cell: ({ row }) => <TagChips tags={row.original.tags ? row.original.tags.split(", ") : []} />,
    },
    {
      accessorKey: "is_system",
      header: "Origen",
      searchable: false,
      minWidth: 100,
      cell: ({ row }) => <OriginPill isSystem={row.original.is_system} />,
    },
    {
      accessorKey: "status",
      header: "Estado",
      searchable: false,
      alwaysVisible: true,
      minWidth: 110,
      cell: ({ row }) => <QualityStatus status={row.original.status} />,
    },
    {
      accessorKey: "updated_at",
      header: "Actualizado",
      searchable: false,
      minWidth: 120,
      cell: ({ row }) => <RelativeDate iso={row.original.updated_at} className="text-muted-foreground" />,
    },
    {
      id: "actions",
      alwaysVisible: true,
      minWidth: 56,
      cell: ({ row }) => {
        const scenario = handlers.getScenario(row.original.id);
        if (!scenario) return null;
        return (
          <ScenarioRowActions
            scenario={scenario}
            onView={handlers.onView}
            onEdit={handlers.onEdit}
            onClone={handlers.onClone}
          />
        );
      },
    },
  ];
}
