"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash } from "lucide-react";
import { Modal } from "@/shared/components/ui/modal";
import { Button } from "@/shared/components/ui/button";
import { useAuth } from "@/shared/auth/auth.hooks";
import { errorMessage } from "@/core/lib/error-messages";
import type { CatalogRow } from "@/modules/catalog/domain/catalog";
import { deleteCatalog } from "@/modules/catalog/infrastructure/services/catalog-service.adapter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

/**
 * Acciones de fila de catálogos. Comunicación con la página vía CustomEvents
 * (`catalogs:edit:open`, `catalogs:delete:success`, `catalogs:error`).
 * Visibles solo con `catalog:manage`.
 */
export function CatalogRowActions({ catalog }: { catalog: CatalogRow }) {
  const { hasPermission } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!hasPermission("catalog:manage")) return null;

  const handleConfirmDelete = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      await deleteCatalog(catalog.id);
      window.dispatchEvent(new CustomEvent("catalogs:delete:success", { detail: { id: catalog.id } }));
      setConfirmOpen(false);
    } catch (err) {
      window.dispatchEvent(
        new CustomEvent("catalogs:error", {
          detail: { message: errorMessage(err, "No se pudo eliminar el catálogo") },
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
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("catalogs:edit:open", {
                  detail: {
                    defaults: {
                      id: catalog.id,
                      name: catalog.name,
                      code: catalog.code,
                      description: catalog.description ?? "",
                    },
                  },
                }),
              )
            }
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
          title: "Eliminar catálogo",
          description: `¿Seguro que deseas eliminar “${catalog.name}”?`,
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true, id: "catalog-delete-cancel" },
            {
              label: submitting ? "Eliminando..." : "Eliminar",
              variant: "destructive",
              asClose: false,
              onClick: handleConfirmDelete,
              id: "catalog-delete-confirm",
            },
          ],
          className: "sm:max-w-md",
        }}
      >
        <div className="text-sm text-muted-foreground">
          Los productos del catálogo dejarán de estar disponibles para la IA y el equipo.
        </div>
      </Modal>
    </div>
  );
}
