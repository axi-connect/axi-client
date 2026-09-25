/**
 * Columnas de la lista de datasets (upgrade F4). Filas planas (contrato del
 * DataTable); la lista pagina EN SERVER (sin `sortable`). «Último resultado»
 * lee la métrica principal del último probe terminado.
 */
import Link from "next/link";
import { Play, Tag } from "lucide-react";
import type { ColumnDef } from "@/shared/components/features/data-table";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import {
  DATASET_KIND_LABELS,
  headlineMetric,
  type DatasetKind,
  type DatasetListItem,
} from "../../../../domain/quality-datasets";
import { StatusBadge } from "../../../components/StatusBadge";
import { DatasetRowActions } from "./DatasetRowActions";

export type DatasetRow = {
  id: string;
  name: string;
  company_name: string;
  kind: DatasetKind;
  items_count: number;
  labeled_count: number;
  labeled_pct: number;
  last_metric_label: string | null;
  last_metric_value: string | null;
  last_run_id: string | null;
  last_run_at: string | null;
  status: string;
  updated_at: string;
};

export function toDatasetRow(dataset: DatasetListItem): DatasetRow {
  const metric = dataset.last_run ? headlineMetric(dataset.kind, dataset.last_run.metrics) : null;
  return {
    id: dataset.id,
    name: dataset.name,
    company_name: dataset.company_name,
    kind: dataset.kind,
    items_count: dataset.items_count,
    labeled_count: dataset.labeled_count,
    labeled_pct: dataset.items_count === 0 ? 0 : Math.round((dataset.labeled_count / dataset.items_count) * 100),
    last_metric_label: metric?.label ?? null,
    last_metric_value: metric?.value ?? null,
    last_run_id: dataset.last_run?.run_id ?? null,
    last_run_at: dataset.last_run?.finished_at ?? null,
    status: dataset.status,
    updated_at: dataset.updated_at,
  };
}

export function buildDatasetColumns(handlers: {
  getDataset: (id: string) => DatasetListItem | undefined;
  onImport: (dataset: DatasetListItem) => void;
  onRename: (dataset: DatasetListItem) => void;
  onArchive: (dataset: DatasetListItem) => void;
  onDelete: (dataset: DatasetListItem) => void;
}): ColumnDef<DatasetRow>[] {
  return [
    {
      accessorKey: "name",
      header: "Dataset",
      minWidth: 220,
      cell: ({ row }) => (
        <Link href={`/platform/quality/datasets/${row.original.id}`} prefetch={false} className="block min-w-0">
          <span className="block truncate font-medium hover:underline">{row.original.name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {row.original.company_name} · {row.original.items_count} ítems
          </span>
        </Link>
      ),
    },
    {
      accessorKey: "kind",
      header: "Capacidad",
      searchable: false,
      minWidth: 150,
      cell: ({ row }) => (
        <Badge variant="outline" className="border-border text-muted-foreground">
          {DATASET_KIND_LABELS[row.original.kind]}
        </Badge>
      ),
    },
    {
      accessorKey: "labeled_count",
      header: "Etiquetados",
      searchable: false,
      minWidth: 130,
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.labeled_count} · {row.original.labeled_pct} %
        </span>
      ),
    },
    {
      accessorKey: "last_metric_value",
      header: "Último resultado",
      searchable: false,
      minWidth: 150,
      cell: ({ row }) =>
        row.original.last_run_id ? (
          <Link
            href={`/platform/quality/runs/${row.original.last_run_id}`}
            prefetch={false}
            className="tabular-nums hover:underline"
          >
            <span className="font-medium">{row.original.last_metric_value ?? "—"}</span>
            <span className="ml-1 text-xs text-muted-foreground">{row.original.last_metric_label ?? ""}</span>
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "last_run_at",
      header: "Corrido",
      searchable: false,
      minWidth: 110,
      cell: ({ row }) =>
        row.original.last_run_at ? (
          <RelativeDate iso={row.original.last_run_at} className="text-muted-foreground" />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "status",
      header: "Estado",
      searchable: false,
      minWidth: 100,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      alwaysVisible: true,
      minWidth: 220,
      cell: ({ row }) => {
        const dataset = handlers.getDataset(row.original.id);
        if (!dataset) return null;
        return (
          <span className="flex items-center justify-end gap-1">
            <Button asChild size="sm" variant="outline">
              <Link href={`/platform/quality/datasets/${dataset.id}`} prefetch={false}>
                <Tag aria-hidden="true" />
                Etiquetar
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost" disabled={dataset.labeled_count === 0}>
              <Link
                href={`/platform/quality/runs/new?kind=probe&company_id=${dataset.company_id}&dataset_id=${dataset.id}&probe_kind=${dataset.kind}`}
                prefetch={false}
              >
                <Play aria-hidden="true" />
                Correr probe
              </Link>
            </Button>
            <DatasetRowActions
              dataset={dataset}
              onImport={handlers.onImport}
              onRename={handlers.onRename}
              onArchive={handlers.onArchive}
              onDelete={handlers.onDelete}
            />
          </span>
        );
      },
    },
  ];
}
