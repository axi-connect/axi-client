"use client";

/**
 * Columna izquierda del banco de etiquetado: filtro por estado (segmentos)
 * y la lista de ítems de la página con miniatura (fotos), título y
 * sugerido/etiqueta. `aria-current` en el ítem abierto.
 */
import { cn } from "@/core/lib/utils";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { Skeleton } from "@/shared/components/ui/skeleton";
import BasicPagination from "@/shared/components/ui/pagination";
import {
  itemSubtitle,
  itemTitle,
  LABEL_STATUS_LABELS,
  labelStatusKey,
  type DatasetItem,
  type DatasetKind,
  type LabelStatus,
} from "../../../../../domain/quality-datasets";
import { StatusBadge } from "../../../../components/StatusBadge";

type ItemsRailProps = {
  kind: DatasetKind;
  name: string;
  remaining: number;
  filter: LabelStatus;
  onFilterChange: (status: LabelStatus) => void;
  items: DatasetItem[];
  loading: boolean;
  currentId: string | null;
  onSelect: (id: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const FILTERS: { value: LabelStatus; label: string }[] = [
  { value: "unlabeled", label: "Sin etiquetar" },
  { value: "labeled", label: "Etiquetados" },
  { value: "disputed", label: "Disputados" },
  { value: "skipped", label: "Omitidos" },
];

export function ItemsRail({ kind, name, remaining, filter, onFilterChange, items, loading, currentId, onSelect, page, totalPages, onPageChange }: ItemsRailProps) {
  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-background" aria-label="Ítems del dataset">
      <div className="space-y-2 border-b border-border/60 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="truncate text-sm font-medium">{name}</h2>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{remaining} por etiquetar</span>
        </div>
        <SegmentedControl
          value={filter}
          onValueChange={onFilterChange}
          label="Estado de etiqueta"
          size="sm"
          items={FILTERS}
          className="max-w-full"
        />
      </div>
      <ol className="min-h-0 flex-1 overflow-y-auto">
        {loading && (
          <li className="space-y-2 p-3">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </li>
        )}
        {!loading && items.length === 0 && (
          <li className="px-4 py-8 text-center text-xs text-muted-foreground">
            Nada en «{LABEL_STATUS_LABELS[filter]}».
          </li>
        )}
        {items.map((item) => {
          const current = item.id === currentId;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={current ? "true" : undefined}
                className={cn(
                  "grid w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-border/60 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary/60",
                  current && "bg-accent",
                )}
              >
                {kind === "recognition" && item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL presignada efímera
                  <img src={item.image_url} alt="" className="size-10 rounded-lg object-cover" loading="lazy" />
                ) : (
                  <span className="grid size-10 place-items-center rounded-lg bg-secondary font-mono text-[10px] text-muted-foreground">
                    {item.id.slice(-4)}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate font-medium">{itemTitle(kind, item)}</span>
                  <span className="block truncate text-xs text-muted-foreground">{itemSubtitle(kind, item)}</span>
                </span>
                <StatusBadge status={labelStatusKey(item.label_status)} />
              </button>
            </li>
          );
        })}
      </ol>
      {totalPages > 1 && (
        <div className="border-t border-border/60 px-2 py-1.5">
          <BasicPagination totalPages={totalPages} page={page} onPageChange={onPageChange} />
        </div>
      )}
    </aside>
  );
}
