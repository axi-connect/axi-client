"use client";

import { FLOW_AI_LABELS, type FormFlow, type RecommendedField } from "@/modules/forms/domain/form";
import { EmptyState } from "@/shared/components/features/empty-state";
import { AddFieldCatalog } from "./AddFieldCatalog";

/**
 * Estado vacío del flujo. Es el estado por defecto de los tres flujos en todo
 * tenant nuevo, así que es la primera impresión de la feature: dice qué se
 * pierde hoy (la IA puede cerrar sin nada) en lugar de solo "no hay datos".
 *
 * Adaptador fino sobre `EmptyState`: antes repetía su layout con un disco
 * `rounded-2xl` propio en vez del círculo, que era una divergencia sin motivo.
 * Se conserva como componente porque encapsula el copy por flujo y el catálogo
 * de campos como CTA.
 */
export function FlowEmptyState({
  flow,
  readOnly,
  onAdd,
}: {
  flow: FormFlow;
  readOnly: boolean;
  onAdd: (preset?: RecommendedField) => void;
}) {
  return (
    <EmptyState
      glyph="ai"
      title="Tu agente todavía no pide nada"
      description={`Puede ${FLOW_AI_LABELS[flow]} sin ningún dato. Añade los que necesites para no cerrar a ciegas.`}
      action={
        readOnly ? undefined : (
          <div className="max-w-64">
            <AddFieldCatalog
              usedCodes={new Set()}
              variant="default"
              label="Añadir el primer dato"
              onPick={onAdd}
            />
          </div>
        )
      }
    />
  );
}
