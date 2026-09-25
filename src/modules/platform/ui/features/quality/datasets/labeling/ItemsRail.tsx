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
import { BigFigure, Meter, QualityStatus } from "../../shared/premium";

type ItemsRailProps = {
  kind: DatasetKind;
  name: string;
  remaining: number;
  labeledCount: number;
  itemsCount: number;
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

// Cortas: las cuatro caben en el rail de 320 px (QA Q4); el nombre completo va en el vacío.
const FILTERS: { value: LabelStatus; label: string }[] = [
  { value: "unlabeled", label: "Pendientes" },
  { value: "labeled", label: "Listos" },
  { value: "disputed", label: "Dudas" },
  { value: "skipped", label: "Omitidos" },
];

export function ItemsRail({ kind, name, remaining, labeledCount, itemsCount, filter, onFilterChange, items, loading, currentId, onSelect, page, totalPages, onPageChange }: ItemsRailProps) {
  return (
    <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border border-border bg-card" aria-label="Ítems del dataset">
      <div className="space-y-3 px-4 pt-4 pb-3">
        <div className="space-y-2">
          <p className="truncate text-xs text-muted-foreground" title={name}>
            {name}
          </p>
          <BigFigure value={labeledCount} unit={`de ${itemsCount} etiquetados`} size="md" />
          <Meter value={itemsCount === 0 ? 0 : labeledCount / itemsCount} label="Ítems etiquetados" />
          <p className="text-xs text-muted-foreground tabular-nums">{remaining} por etiquetar</p>
        </div>
        <div className="-mx-1 overflow-x-auto px-1">
        <SegmentedControl
          value={filter}
          onValueChange={onFilterChange}
          label="Estado de etiqueta"
          size="sm"
          surface="inline"
          items={FILTERS}
          className="w-max"
        />
        </div>
      </div>
      <ol className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
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
                  "grid w-full grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-2.5 py-2 text-left text-sm transition-colors hover:bg-secondary",
                  current && "bg-accent",
                )}
              >
                {kind === "recognition" && item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL presignada efímera
                  <img src={item.image_url} alt="" className="size-11 rounded-xl object-cover" loading="lazy" />
                ) : (
                  <span className="grid size-11 place-items-center rounded-xl bg-secondary font-mono text-[10px] text-muted-foreground">
                    {item.id.slice(-4)}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate font-medium">{itemTitle(kind, item)}</span>
                  <span className="block truncate text-xs text-muted-foreground">{itemSubtitle(kind, item)}</span>
                </span>
                <QualityStatus status={labelStatusKey(item.label_status)} />
              </button>
            </li>
          );
        })}
      </ol>
      {totalPages > 1 && (
        <div className="border-t border-border px-2 py-1.5">
          <BasicPagination totalPages={totalPages} page={page} onPageChange={onPageChange} />
        </div>
      )}
    </aside>
  );
}
