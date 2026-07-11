"use client";

import { useState } from "react";
import { PackagePlus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import type { ProductVariantDTO, StockDTO } from "@/modules/catalog/domain/product";
import { adjustVariantStock } from "@/modules/catalog/infrastructure/services/product-service.adapter";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";

/**
 * Ajuste de inventario de una variante (requiere permiso `catalog:stock`).
 * `set` fija el valor; `increment` suma/resta. La respuesta actualiza la
 * fila localmente sin re-fetch del producto.
 */
export function StockAdjustPopover({
  variant,
  onAdjusted,
  setAlert,
}: {
  variant: ProductVariantDTO;
  onAdjusted: (variantId: string, stock: StockDTO) => void;
  setAlert?: (cfg: { variant: "default" | "destructive" | "success"; title: string; description?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [op, setOp] = useState<"set" | "increment">("set");
  const [quantity, setQuantity] = useState("");
  const [threshold, setThreshold] = useState(
    variant.stock ? String(variant.stock.out_of_stock_threshold) : "",
  );
  const [submitting, setSubmitting] = useState(false);

  const apply = async () => {
    const parsedQuantity = Number(quantity);
    if (quantity.trim() === "" || !Number.isInteger(parsedQuantity)) {
      setAlert?.({ variant: "destructive", title: "Indica una cantidad entera" });
      return;
    }
    if (op === "set" && parsedQuantity < 0) {
      setAlert?.({ variant: "destructive", title: "Al fijar, la cantidad debe ser ≥ 0" });
      return;
    }
    const parsedThreshold = threshold.trim() === "" ? undefined : Number(threshold);
    if (parsedThreshold !== undefined && (!Number.isInteger(parsedThreshold) || parsedThreshold < 0)) {
      setAlert?.({ variant: "destructive", title: "El umbral debe ser un entero ≥ 0" });
      return;
    }

    try {
      setSubmitting(true);
      const stock = await adjustVariantStock(variant.id, {
        op,
        quantity: parsedQuantity,
        ...(parsedThreshold !== undefined ? { out_of_stock_threshold: parsedThreshold } : {}),
      });
      onAdjusted(variant.id, stock);
      setAlert?.({ variant: "success", title: "Stock actualizado" });
      setOpen(false);
      setQuantity("");
    } catch (err) {
      setAlert?.({ variant: "destructive", title: errorMessage(err, "No se pudo ajustar el stock") });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ajustar stock de ${variant.sku}`}>
          <PackagePlus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <p className="text-sm font-medium">Ajustar stock — {variant.sku}</p>

        <div className="inline-flex w-full rounded-xl border border-border p-1" role="group" aria-label="Tipo de ajuste">
          {(["set", "increment"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={op === mode}
              className={cn(
                "flex-1 rounded-lg px-3 py-1.5 text-sm transition-colors",
                op === mode ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setOp(mode)}
            >
              {mode === "set" ? "Fijar" : "Sumar / restar"}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`stock-qty-${variant.id}`}>Cantidad</Label>
          <Input
            id={`stock-qty-${variant.id}`}
            type="number"
            step={1}
            value={quantity}
            placeholder={op === "set" ? "128" : "-5 resta, 5 suma"}
            className="tabular-nums"
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`stock-threshold-${variant.id}`}>Umbral de agotado</Label>
          <Input
            id={`stock-threshold-${variant.id}`}
            type="number"
            min={0}
            step={1}
            value={threshold}
            placeholder="0"
            className="tabular-nums"
            onChange={(e) => setThreshold(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Disponible cuando el stock supera el umbral</p>
        </div>

        <Button type="button" className="w-full" onClick={() => void apply()} disabled={submitting}>
          {submitting ? "Aplicando…" : "Aplicar"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
