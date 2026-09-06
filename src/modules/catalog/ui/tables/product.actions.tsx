"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, MoreHorizontal, Pencil, Trash } from "lucide-react";
import { Modal } from "@/shared/components/ui/modal";
import { Button } from "@/shared/components/ui/button";
import { useAuth } from "@/shared/auth/auth.hooks";
import { errorMessage } from "@/core/lib/error-messages";
import type { ProductRow } from "@/modules/catalog/domain/product";
import { deleteProduct } from "@/modules/catalog/infrastructure/services/product-service.adapter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

/**
 * Acciones de fila/tarjeta de productos. Ver y editar navegan al detalle
 * (hub editable); eliminar emite `products:delete:success` / `products:error`.
 */
export function ProductRowActions({ product }: { product: ProductRow }) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canManage = hasPermission("catalog:manage");

  const handleConfirmDelete = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      await deleteProduct(product.id);
      window.dispatchEvent(new CustomEvent("products:delete:success", { detail: { id: product.id } }));
      setConfirmOpen(false);
    } catch (err) {
      window.dispatchEvent(
        new CustomEvent("products:error", {
          detail: { message: errorMessage(err, "No se pudo eliminar el producto") },
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
            <span className="sr-only">Abrir menú de acciones</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="flex items-center gap-2"
            onClick={() => router.push(`/catalog/products/${product.id}`)}
          >
            <Eye className="h-4 w-4" />
            <span>Ver producto</span>
          </DropdownMenuItem>
          {canManage && (
            <DropdownMenuItem
              className="flex items-center gap-2"
              onClick={() => router.push(`/catalog/products/${product.id}`)}
            >
              <Pencil className="h-4 w-4" />
              <span>Editar</span>
            </DropdownMenuItem>
          )}
          {/* Un producto espejado lo gobierna la tienda conectada: borrarlo aquí
              solo devolvería un 409 del backend con su detalle crudo. */}
          {canManage && !product.governed && (
            <DropdownMenuItem
              className="flex items-center gap-2 text-destructive"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash className="h-4 w-4" />
              <span>Eliminar</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        config={{
          title: "Eliminar producto",
          description: `¿Seguro que deseas eliminar “${product.name}”?`,
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true, id: "product-delete-cancel" },
            {
              label: submitting ? "Eliminando..." : "Eliminar",
              variant: "destructive",
              asClose: false,
              onClick: handleConfirmDelete,
              id: "product-delete-confirm",
            },
          ],
          className: "sm:max-w-md",
        }}
      >
        <div className="text-sm text-muted-foreground">
          El producto dejará de aparecer en el catálogo y para la IA. Sus variantes se conservan en el histórico.
        </div>
      </Modal>
    </div>
  );
}
