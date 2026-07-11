"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash } from "lucide-react";
import { Modal } from "@/shared/components/ui/modal";
import { Button } from "@/shared/components/ui/button";
import { useAuth } from "@/shared/auth/auth.hooks";
import { errorMessage } from "@/core/lib/error-messages";
import type { ProductTypeRow } from "@/modules/catalog/domain/product-type";
import { deleteProductType } from "@/modules/catalog/infrastructure/services/product-type-service.adapter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

/**
 * Acciones de fila de tipos de producto. Editar navega a la página de
 * detalle (el editor de atributos no cabe en modal); eliminar emite
 * `product-types:delete:success` / `product-types:error`.
 */
export function ProductTypeRowActions({ productType }: { productType: ProductTypeRow }) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!hasPermission("catalog:manage")) return null;

  const handleConfirmDelete = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      await deleteProductType(productType.id);
      window.dispatchEvent(
        new CustomEvent("product-types:delete:success", { detail: { id: productType.id } }),
      );
      setConfirmOpen(false);
    } catch (err) {
      window.dispatchEvent(
        new CustomEvent("product-types:error", {
          detail: { message: errorMessage(err, "No se pudo eliminar el tipo de producto") },
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
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menú de acciones</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="flex items-center gap-2"
            onClick={() => router.push(`/catalog/product-types/${productType.id}`)}
          >
            <Pencil className="h-4 w-4" />
            <span>Editar</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="flex items-center gap-2 text-destructive" onClick={() => setConfirmOpen(true)}>
            <Trash className="h-4 w-4" />
            <span>Eliminar</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        config={{
          title: "Eliminar tipo de producto",
          description: `¿Seguro que deseas eliminar “${productType.name}”?`,
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true, id: "product-type-delete-cancel" },
            {
              label: submitting ? "Eliminando..." : "Eliminar",
              variant: "destructive",
              asClose: false,
              onClick: handleConfirmDelete,
              id: "product-type-delete-confirm",
            },
          ],
          className: "sm:max-w-md",
        }}
      >
        <div className="text-sm text-muted-foreground">
          Solo puede eliminarse si ningún producto lo usa. Sus atributos se borran con él.
        </div>
      </Modal>
    </div>
  );
}
