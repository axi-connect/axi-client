"use client";

import { Modal } from "@/shared/components/ui/modal";

/**
 * Confirmación breve antes de rechazar un dato. Destructivo en `destructive`,
 * nunca coral. Ambas acciones cierran el diálogo (comportamiento por defecto
 * de `Modal`); el desenlace lo cuenta la fila al refrescarse o el aviso de error.
 */
export function RejectFieldDialog({
  open,
  onOpenChange,
  valueLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Valor tal como se pinta en la fila («Kodecol»). */
  valueLabel: string;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      config={{
        title: `¿Rechazar «${valueLabel}»?`,
        description: "Se borra de la ficha y el agente podrá volver a pedirlo.",
        actions: [
          { id: "reject-cancel", label: "Cancelar", variant: "outline" },
          { id: "reject-confirm", label: "Rechazar", variant: "destructive", onClick: onConfirm },
        ],
      }}
    />
  );
}
