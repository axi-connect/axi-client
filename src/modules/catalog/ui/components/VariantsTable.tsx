"use client";

import { useState } from "react";
import { Lock, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { cn } from "@/core/lib/utils";
import { formatMoney } from "@/core/lib/format";
import { errorMessage } from "@/core/lib/error-messages";
import type { ProductTypeAttributeDTO } from "@/modules/catalog/domain/product-type";
import type { ProductDTO, ProductVariantDTO, StockDTO } from "@/modules/catalog/domain/product";
import { deleteVariant } from "@/modules/catalog/infrastructure/services/product-service.adapter";
import { VariantForm } from "@/modules/catalog/ui/forms/VariantForm";
import { StockAdjustPopover } from "./StockAdjustPopover";
import { DepartureCalendar, departureLabel } from "./DepartureCalendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import type { AppAlert } from "@/core/notifications";

function VariantStockCell({ variant, isService }: { variant: ProductVariantDTO; isService: boolean }) {
  if (isService) return <span className="text-muted-foreground">—</span>;
  if (!variant.stock) {
    return <span className="text-sm text-muted-foreground">Sin inventario</span>;
  }
  const { on_hand, out_of_stock_threshold, available } = variant.stock;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span
        aria-hidden
        className={cn("h-2 w-2 shrink-0 rounded-full", available ? "bg-success" : "bg-destructive")}
      />
      <span className="tabular-nums">{on_hand}</span>
      <span className="text-muted-foreground tabular-nums">
        {available ? "disponible" : `agotado (umbral ${out_of_stock_threshold})`}
      </span>
    </span>
  );
}

/**
 * Variantes y stock del detalle de producto (tabla local, no DataTable:
 * las filas traen objetos anidados y el set es pequeño).
 * ⚠️ Editar variante exige re-fetch del producto (el PATCH no lo devuelve).
 */
export function VariantsTable({
  product,
  axes,
  canManage,
  canAdjustStock,
  onRefetch,
  onStockAdjusted,
  setAlert,
  lockNote,
}: {
  product: ProductDTO;
  axes: ProductTypeAttributeDTO[];
  canManage: boolean;
  canAdjustStock: boolean;
  onRefetch: () => Promise<void>;
  onStockAdjusted: (variantId: string, stock: StockDTO) => void;
  setAlert?: (alert: AppAlert) => void;
  /** Catálogo premium F5: qué de esta sección manda la tienda conectada. */
  lockNote?: string;
}) {
  const isService = product.kind === "service";
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductVariantDTO | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<ProductVariantDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const variants = [...product.variants].sort((a, b) => a.position - b.position);
  const hasAxes = variants.some((variant) => Object.keys(variant.attributes).length > 0);

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  const openEdit = (variant: ProductVariantDTO) => {
    setEditing(variant);
    setFormOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    try {
      setDeleting(true);
      await deleteVariant(deleteTarget.id);
      setAlert?.({ tone: "success", title: "Variante eliminada" });
      setDeleteTarget(null);
      await onRefetch();
    } catch (err) {
      setAlert?.({ tone: "error", title: errorMessage(err, "No se pudo eliminar la variante") });
    } finally {
      setDeleting(false);
    }
  };

  const formatAttributes = (variant: ProductVariantDTO) =>
    Object.entries(variant.attributes)
      .map(([code, value]) => {
        const axis = axes.find((a) => a.code === code);
        // Una fecha se lee como fecha («sáb 14 nov»), no como 2026-11-14.
        const shown = axis?.type === "date" && typeof value === "string" ? departureLabel(value) : String(value);
        return `${axis?.label ?? code}: ${shown}`;
      })
      .join(" · ");

  return (
    <section id="variantes" className="scroll-mt-24 space-y-4" aria-label="Variantes y stock">
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[15px] font-semibold">
            Variantes{isService ? "" : " y stock"}{" "}
            <span className="font-normal text-muted-foreground tabular-nums">({variants.length})</span>
          </h2>
          {lockNote ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock aria-hidden="true" className="size-3" />
              {lockNote}
            </p>
          ) : null}
        </div>
        {canManage && (
          <Button type="button" size="sm" variant="outline" className="rounded-full px-4" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Añadir variante
          </Button>
        )}
      </div>

      <DepartureCalendar variants={variants} isService={isService} />

      {/* `Table` ya trae su scroll interno (.axi-scroll): la tabla no empuja la ficha. */}
      <div className="min-w-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              {/* Nombre y atributos en una celda (canvas tablero 4): la tabla cabe en su columna. */}
              <TableHead>{hasAxes ? "Variante" : "Nombre"}</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>{isService ? "" : "Stock"}</TableHead>
              {(canManage || canAdjustStock) && (
                <TableHead className="text-right">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.map((variant) => (
              <TableRow key={variant.id} className={cn(!variant.is_active && "opacity-60")}>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                    {variant.is_default && (
                      <Star className="h-3.5 w-3.5 shrink-0 text-brand" aria-label="Variante por defecto" />
                    )}
                    {variant.sku}
                  </span>
                </TableCell>
                <TableCell className="text-sm">
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span>{variant.name || "—"}</span>
                    {hasAxes && formatAttributes(variant) ? (
                      <span className="text-xs text-muted-foreground">{formatAttributes(variant)}</span>
                    ) : null}
                  </span>
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap tabular-nums">
                  {formatMoney(variant.price_cents, product.currency)}
                </TableCell>
                <TableCell>
                  {/* El estado en el punto, el texto en foreground (DS §10). */}
                  <span className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap">
                    <span
                      aria-hidden="true"
                      className={cn("size-1.5 rounded-full", variant.is_active ? "bg-success" : "bg-muted-foreground")}
                    />
                    {variant.is_active ? "Activa" : "Inactiva"}
                  </span>
                </TableCell>
                <TableCell>
                  <VariantStockCell variant={variant} isService={isService} />
                </TableCell>
                {(canManage || canAdjustStock) && (
                  <TableCell>
                    <div className="flex items-center justify-end gap-0.5">
                      {canAdjustStock && !isService && (
                        <StockAdjustPopover variant={variant} onAdjusted={onStockAdjusted} setAlert={setAlert} />
                      )}
                      {canManage && (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Editar variante ${variant.sku}`}
                            onClick={() => openEdit(variant)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            aria-label={`Eliminar variante ${variant.sku}`}
                            onClick={() => setDeleteTarget(variant)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Modal
        open={formOpen}
        onOpenChange={setFormOpen}
        config={{
          title: editing ? `Editar variante ${editing.sku}` : "Añadir variante",
          description: editing
            ? "Actualiza los datos de la variante"
            : "La combinación de atributos debe ser única en el producto",
          className: "sm:max-w-2xl",
        }}
      >
        <VariantForm
          key={editing?.id ?? "create"}
          productId={product.id}
          variant={editing}
          axes={axes}
          isService={isService}
          currency={product.currency}
          setAlert={setAlert}
          onCancel={() => setFormOpen(false)}
          onSaved={async () => {
            setFormOpen(false);
            await onRefetch();
          }}
        />
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        config={{
          title: "Eliminar variante",
          description: `¿Seguro que deseas eliminar la variante “${deleteTarget?.sku ?? ""}”?`,
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true, id: "variant-delete-cancel" },
            {
              label: deleting ? "Eliminando…" : "Eliminar",
              variant: "destructive",
              asClose: false,
              onClick: handleConfirmDelete,
              id: "variant-delete-confirm",
            },
          ],
          className: "sm:max-w-md",
        }}
      >
        <div className="text-sm text-muted-foreground">
          No puede eliminarse la última variante activa. Si era la variante por defecto, otra activa tomará su lugar.
        </div>
      </Modal>
    </section>
  );
}
