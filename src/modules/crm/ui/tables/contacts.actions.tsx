"use client";

import { useRouter } from "next/navigation";
import { Eye, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import type { ContactRow } from "@/modules/crm/domain/contact";
import { deleteContact } from "@/modules/crm/infrastructure/services/contacts-service.adapter";

/**
 * Menú ⋮ de la fila de contactos: Ver abre el 360; Editar abre el modal por
 * ruta interceptada; Eliminar (gate `contacts:manage`) confirma con Modal y
 * notifica vía CustomEvent `crm:contacts:delete:success`.
 */
export function ContactRowActions({ row }: { row: ContactRow }) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { showAlert, showModal, closeModal } = useAlert();
  const canManage = hasPermission("contacts:manage");

  const handleDelete = async () => {
    try {
      await deleteContact(row.id);
      window.dispatchEvent(new CustomEvent("crm:contacts:delete:success"));
      showAlert({ tone: "success", title: "Contacto eliminado", open: true });
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudo eliminar el contacto"),
        open: true,
      });
    } finally {
      closeModal();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Acciones de ${row.full_name}`}>
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="flex items-center gap-2"
          onClick={() => router.push(`/crm/contacts/${row.id}`)}
        >
          <Eye className="size-4" /> Ver contacto
        </DropdownMenuItem>
        {canManage && (
        <DropdownMenuItem
          className="flex items-center gap-2"
          onClick={() => router.push(`/crm/contacts/update/${row.id}`)}
        >
          <Pencil className="size-4" /> Editar
        </DropdownMenuItem>
        )}
        {canManage && (
        <DropdownMenuItem
          className="flex items-center gap-2 text-destructive"
          onClick={() =>
            showModal({
              title: "Eliminar contacto",
              description: `¿Seguro que deseas eliminar a “${row.full_name}”? Sus conversaciones y pedidos se conservan.`,
              actions: [
                { label: "Cancelar", variant: "outline", asClose: true, id: "contact-delete-cancel" },
                {
                  label: "Eliminar",
                  variant: "destructive",
                  asClose: false,
                  id: "contact-delete-confirm",
                  onClick: () => void handleDelete(),
                },
              ],
              className: "sm:max-w-md",
            })
          }
        >
          <Trash2 className="size-4" /> Eliminar
        </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
