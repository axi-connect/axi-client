"use client";

import { useCallback, useRef, useState } from "react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { emitJourneyChanged } from "@/modules/crm/infrastructure/journey-events";
import { revertStageChange } from "@/modules/crm/infrastructure/services/journey-service.adapter";

export interface RevertStageChangeInput {
  contactId: string;
  dealId: string;
  eventId: string;
  /** A dónde había pasado la oportunidad (lo que se deshace). */
  toStageName: string;
  /** A dónde vuelve; null si no se sabe. */
  fromStageName: string | null;
  /** Lo movió el agente: el aviso dice que sus movimientos quedan en pausa. */
  byAi: boolean;
}

/**
 * «Deshacer» un cambio de etapa, igual desde la card «Recorrido» que desde el
 * historial: confirma en un modal, llama al servidor UNA vez (el `busy` en
 * ref corta el doble clic antes de que React repinte), avisa y emite
 * `crm:journey:changed` del contacto para que las otras piezas recarguen.
 */
export function useRevertStageChange({
  onReverted,
}: {
  /**
   * Se llama al deshacer con éxito, ANTES de avisar a las otras piezas. El
   * botón que abrió el modal desaparece al recargar y el foco caería en
   * `<body>` (Q15): el llamador lo usa para devolverlo a algo con sentido.
   */
  onReverted?: () => void;
} = {}): {
  revert: (input: RevertStageChangeInput) => void;
  busy: boolean;
} {
  const { showAlert, showModal, closeModal } = useAlert();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const onRevertedRef = useRef(onReverted);
  onRevertedRef.current = onReverted;

  const revert = useCallback(
    (input: RevertStageChangeInput) => {
      if (busyRef.current) return;
      const back = input.fromStageName === null ? "a la etapa anterior" : `a ${input.fromStageName}`;
      showModal({
        title: `¿Deshacer el paso a ${input.toStageName}?`,
        description: input.byAi
          ? `La oportunidad vuelve ${back} y queda en el historial. Los movimientos del agente sobre esta oportunidad quedan en pausa hasta que los reanudes.`
          : `La oportunidad vuelve ${back} y queda en el historial.`,
        actions: [
          { label: "Cancelar", variant: "outline" },
          {
            label: "Deshacer",
            onClick: () => {
              if (busyRef.current) return;
              busyRef.current = true;
              setBusy(true);
              closeModal();
              revertStageChange(input.dealId, input.eventId)
                .then(() => {
                  onRevertedRef.current?.();
                  showAlert({
                    tone: "success",
                    title: `Movimiento deshecho: vuelve ${back}`,
                    autoCloseMs: 2000,
                    open: true,
                  });
                  emitJourneyChanged({ contactId: input.contactId, dealId: input.dealId });
                })
                .catch((err: unknown) => {
                  showAlert({ tone: "error", title: errorMessage(err, "No se pudo deshacer"), open: true });
                })
                .finally(() => {
                  busyRef.current = false;
                  setBusy(false);
                });
            },
          },
        ],
      });
    },
    [closeModal, showAlert, showModal],
  );

  return { revert, busy };
}
