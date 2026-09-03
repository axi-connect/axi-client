"use client";

import { useCallback, useRef, useState } from "react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import type { ChannelDTO } from "@/modules/channels/domain/channel";
import { DELETE_CONFIRMATION } from "@/modules/channels/domain/channel-health";
import { deleteChannel } from "@/modules/channels/infrastructure/services/channels-service.adapter";
import { useChannelStore } from "@/modules/channels/infrastructure/stores/channels.store";

/**
 * Borrar un canal, UNA vez: confirmación, `DELETE`, salida del store y aviso.
 *
 * La página de detalle y el panel del workspace lo tenían escrito cada uno —con
 * textos ya divergentes y ninguno con guarda contra el doble clic: dos pulsaciones
 * rápidas en «Eliminar» mandaban dos `DELETE`, y el segundo volvía como error
 * sobre un canal que ya no existía. Lo que difiere entre hosts (navegar al
 * listado, cerrar el panel) va en `onDeleted`.
 *
 * El store se actualiza en optimista tras el `DELETE`: no hace falta volver a
 * pedir la lista para que el canal desaparezca.
 */
export function useDeleteChannel({ onDeleted }: { onDeleted?: (channelId: string) => void } = {}) {
  const { showModal, closeModal, showAlert } = useAlert();
  const removeChannel = useChannelStore((s) => s.removeChannel);
  const [deleting, setDeleting] = useState(false);
  // Ref y no solo estado: el `onClick` del modal se creó con el `deleting` del
  // render de apertura, así que leer el estado ahí no vería el segundo clic
  const deletingRef = useRef(false);

  const confirmDelete = useCallback(
    (channel: Pick<ChannelDTO, "id" | "name">) => {
      showModal({
        title: DELETE_CONFIRMATION.title,
        description: DELETE_CONFIRMATION.describe(channel.name),
        className: "sm:max-w-md",
        actions: [
          { label: "Cancelar", variant: "outline", asClose: true, id: "channel-delete-cancel" },
          {
            label: "Eliminar",
            variant: "destructive",
            asClose: false,
            id: "channel-delete-confirm",
            onClick: async () => {
              if (deletingRef.current) return;
              deletingRef.current = true;
              setDeleting(true);
              try {
                await deleteChannel(channel.id);
                removeChannel(channel.id);
                closeModal();
                showAlert({ tone: "success", title: "Canal eliminado", open: true, autoCloseMs: 3500 });
                onDeleted?.(channel.id);
              } catch (err) {
                showAlert({
                  tone: "error",
                  title: errorMessage(err, "No se pudo eliminar el canal"),
                  open: true,
                });
              } finally {
                deletingRef.current = false;
                setDeleting(false);
              }
            },
          },
        ],
      });
    },
    [closeModal, onDeleted, removeChannel, showAlert, showModal],
  );

  return { confirmDelete, deleting };
}
