"use client";

import { useState } from "react";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { Separator } from "@/shared/components/ui/separator";
import { cn } from "@/core/lib/utils";
import { formatMoney } from "@/core/lib/format";
import { errorMessage } from "@/core/lib/error-messages";
import type { ProductTypeAttributeDTO } from "@/modules/catalog/domain/product-type";
import type { ProductDTO, ProductVariantDTO, StockDTO } from "@/modules/catalog/domain/product";
import { deleteVariant } from "@/modules/catalog/infrastructure/services/product-service.adapter";
import { VariantForm } from "@/modules/catalog/ui/forms/VariantForm";
import { StockAdjustPopover } from "./StockAdjustPopover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

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
}: {
  product: ProductDTO;
  axes: ProductTypeAttributeDTO[];
  canManage: boolean;
  canAdjustStock: boolean;
  onRefetch: () => Promise<void>;
  onStockAdjusted: (variantId: string, stock: StockDTO) => void;
  setAlert?: (cfg: { variant: "default" | "destructive" | "success"; title: string; description?: string }) => void;
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
      setAlert?.({ variant: "success", title: "Variante eliminada" });
      setDeleteTarget(null);
      await onRefetch();
    } catch (err) {
      setAlert?.({ variant: "destructive", title: errorMessage(err, "No se pudo eliminar la variante") });
    } finally {
      setDeleting(false);
    }
  };

  const formatAttributes = (variant: ProductVariantDTO) =>
    Object.entries(variant.attributes)
      .map(([code, value]) => {
        const axis = axes.find((a) => a.code === code);
        return `${axis?.label ?? code}: ${String(value)}`;
      })
      .join(" · ");

  return (
    <section className="space-y-4" aria-label="Variantes y stock">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">
          Variantes{isService ? "" : " y stock"}{" "}
          <span className="font-normal text-muted-foreground tabular-nums">({variants.length})</span>
        </h3>
        {canManage && (
          <Button type="button" variant="outline" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Añadir variante
          </Button>
        )}
      </div>
      <Separator />

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Nombre</TableHead>
              {hasAxes && <TableHead>Atributos</TableHead>}
              <TableHead>Precio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>{isService ? "" : "Stock"}</TableHead>
              {(canManage || canAdjustStock) && <TableHead className="text-right">Acciones</TableHead>}
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
                <TableCell className="text-sm">{variant.name || "—"}</TableCell>
                {hasAxes && (
                  <TableCell className="text-sm text-muted-foreground">
                    {formatAttributes(variant) || "—"}
                  </TableCell>
                )}
                <TableCell className="text-sm tabular-nums">
                  {formatMoney(variant.price_cents, product.currency)}
                </TableCell>
                <TableCell>
                  <Badge variant={variant.is_active ? "default" : "secondary"}>
                    {variant.is_active ? "Activa" : "Inactiva"}
                  </Badge>
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
              label: deleting ? "Eliminando..." : "Eliminar",
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
