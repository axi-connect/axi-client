"use client";

/**
 * Confirmación fuerte para acciones destructivas (suspender una empresa,
 * migrar datos): es el nivel `destructive` de la confirmación por riesgo
 * (`RiskConfirm`, rediseño F1). Se conserva el nombre y el contrato para no
 * tocar a sus consumidores antes de su fase: expone las consecuencias y exige
 * escribir el texto exacto para habilitar el botón rojo (nunca coral).
 */
import { RiskConfirmDialog } from "./RiskConfirm";

type ConfirmTypedProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Consecuencias de la acción, en claro y con tuteo. */
  description: React.ReactNode;
  /** Texto que el usuario debe escribir exactamente (p.ej. el nombre de la empresa). */
  confirmText: string;
  /** Verbo del botón destructivo («Suspender», «Migrar datos»). */
  actionLabel: string;
  onConfirm: () => void | Promise<void>;
  /** Deshabilita todo mientras la mutación está en vuelo. */
  pending?: boolean;
};

export function ConfirmTyped({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  actionLabel,
  onConfirm,
  pending = false,
}: ConfirmTypedProps) {
  return (
    <RiskConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      level="destructive"
      title={title}
      description={description}
      confirmLabel={actionLabel}
      confirmText={confirmText}
      onConfirm={onConfirm}
      pending={pending}
    />
  );
}
