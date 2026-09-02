"use client";

import { useMemo, useState } from "react";

import { cn } from "@/core/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { PriceInput } from "@/shared/components/features/price-input/PriceInput";
import {
  CONFIDENCE_LABELS,
  LOW_CONFIDENCE,
  applyEdits,
  commitableCount,
  confidenceTone,
  excludeIncomplete,
  filterItems,
  missingFor,
  reviewBlockers,
  type CatalogImportItemDTO,
  type ConfidenceTone,
  type ItemEdits,
  type ReviewFilter,
} from "@/modules/onboarding/domain/catalog-import";

const TONE_BADGE: Record<ConfidenceTone, string> = {
  ready: "bg-success/12 text-success",
  review: "bg-warning/14 text-warning",
  missing: "bg-warning/14 text-warning",
  duplicate: "bg-secondary text-muted-foreground",
  excluded: "bg-secondary text-muted-foreground",
};

/**
 * Tabla de revisión de lo que la IA extrajo. Cada fila se edita en línea; las
 * celdas de baja confianza llevan borde ámbar y las que faltan explican qué
 * hacer. Los cambios viven en `edits` (del padre) hasta el commit: así una
 * recarga a mitad no pierde nada del servidor y el PATCH va solo con lo que
 * cambió. La IA nunca inventa un precio: sin precio no se crea.
 */
export function ExtractedProductsReview({
  items,
  edits,
  onEditsChange,
}: {
  items: readonly CatalogImportItemDTO[];
  edits: Record<string, ItemEdits>;
  onEditsChange: (next: Record<string, ItemEdits>) => void;
}) {
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const reviewItems = useMemo(() => items.map((item) => applyEdits(item, edits[item.id])), [items, edits]);
  const visible = useMemo(() => filterItems(reviewItems, filter), [reviewItems, filter]);
  const blockers = reviewBlockers(reviewItems);
  const ready = commitableCount(reviewItems);

  const edit = (id: string, patch: ItemEdits) => onEditsChange({ ...edits, [id]: { ...edits[id], ...patch } });

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl<ReviewFilter>
          label="Filtrar productos"
          value={filter}
          onValueChange={setFilter}
          surface="inline"
          size="sm"
          items={[
            { value: "all", label: "Todos", count: reviewItems.length },
            { value: "needs_input", label: "Falta información", count: blockers.length },
            { value: "ready", label: "Listos", count: ready },
          ]}
        />
        {blockers.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => onEditsChange(excludeIncomplete(reviewItems, edits))}>
            Excluir los incompletos ({blockers.length})
          </Button>
        ) : null}
      </div>

      <div className="border-border overflow-x-auto rounded-2xl border">
        <Table className="min-w-[52rem]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pl-4">
                <span className="sr-only">Incluir</span>
              </TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-44">Precio (COP)</TableHead>
              <TableHead className="w-40">Categoría</TableHead>
              <TableHead className="w-32">Tipo</TableHead>
              <TableHead className="w-28">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((item) => {
              const tone = confidenceTone(item);
              const missing = missingFor(item);
              const lowConfidence = item.included && item.confidence < LOW_CONFIDENCE;
              return (
                <TableRow key={item.id} data-tone={tone} className={cn(!item.included && "opacity-60")}>
                  <TableCell className="pl-4 align-top">
                    <Checkbox
                      aria-label={`Incluir ${item.name || "producto sin nombre"}`}
                      checked={item.included}
                      onChange={(event) => edit(item.id, { included: event.target.checked })}
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <Input
                      aria-label="Nombre"
                      value={item.name}
                      onChange={(event) => edit(item.id, { name: event.target.value })}
                      className={cn("h-8", missing.includes("name") && "border-destructive/60")}
                    />
                    <p className="text-muted-foreground mt-1 text-[0.6875rem]">{item.source_ref}</p>
                  </TableCell>
                  <TableCell className="align-top">
                    <PriceInput
                      value={item.price_cents}
                      onChange={(cents) => edit(item.id, { price_cents: cents })}
                      placeholder="Escribe el precio"
                      className={cn("h-8", lowConfidence && !missing.includes("price_cents") && "border-warning/70")}
                      aria-invalid={missing.includes("price_cents") ? true : undefined}
                    />
                    {missing.includes("price_cents") && item.included ? (
                      <p className="text-destructive mt-1 text-[0.6875rem] leading-snug">
                        La IA no encontró el precio: escríbelo o excluye el producto.
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top">
                    <Input
                      aria-label="Categoría"
                      value={item.category ?? ""}
                      onChange={(event) => edit(item.id, { category: event.target.value || null })}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <select
                      aria-label="Tipo"
                      value={item.kind}
                      onChange={(event) => edit(item.id, { kind: event.target.value as "product" | "service" })}
                      className="border-input h-8 w-full rounded-md border bg-transparent px-2 text-sm"
                    >
                      <option value="product">Producto</option>
                      <option value="service">Servicio</option>
                    </select>
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge className={cn("border-transparent", TONE_BADGE[tone])}>{CONFIDENCE_LABELS[tone]}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-8 text-center text-sm">
                  Nada que mostrar con este filtro.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <p className="text-muted-foreground text-xs">
        Mostrando {visible.length} de {reviewItems.length}. Las celdas con borde ámbar tienen baja confianza: revisa que el valor sea el correcto.
      </p>
    </div>
  );
}
