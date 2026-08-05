"use client";

import { ClipboardList } from "lucide-react";
import { FLOW_AI_LABELS, type FormFlow, type RecommendedField } from "@/modules/forms/domain/form";
import { AddFieldCatalog } from "./AddFieldCatalog";

/**
 * Estado vacío del flujo. Es el estado por defecto de los tres flujos en todo
 * tenant nuevo, así que es la primera impresión de la feature: dice qué se
 * pierde hoy (la IA puede cerrar sin nada) en lugar de solo "no hay datos".
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
    <div className="rounded-2xl border border-dashed border-border p-8 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent-violet/10">
        <ClipboardList className="size-6 text-accent-violet" aria-hidden />
      </div>

      <h3 className="mt-4 text-xl font-semibold tracking-tight">Tu agente todavía no pide nada</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Puede {FLOW_AI_LABELS[flow]} sin ningún dato. Añade los que necesites para no cerrar a
        ciegas.
      </p>

      {!readOnly && (
        <div className="mx-auto mt-5 max-w-64">
          <AddFieldCatalog
            usedCodes={new Set()}
            variant="default"
            label="Añadir el primer dato"
            onPick={onAdd}
          />
        </div>
      )}
    </div>
  );
}
