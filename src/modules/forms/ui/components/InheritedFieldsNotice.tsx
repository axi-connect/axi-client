"use client";

import { Badge } from "@/shared/components/ui/badge";
import { FLOW_LABELS, type EditableFormField, type FormFlow } from "@/modules/forms/domain/form";
import { FieldTypeIcon } from "./FieldTypeIcon";

/**
 * La herencia del backend, hecha visible: `create_order.tool.ts` concatena
 * `contact_registration.fields + order_intake.fields`.
 *
 * Es el punto ciego más peligroso de la feature: un tenant con 0 campos de
 * pedido y 3 de cliente cree que "no pide nada" cuando en realidad pide 3. Por
 * eso el bloque se pinta también cuando la lista del pedido está vacía.
 *
 * Solo aplica a `order_intake`: es el único flujo que hereda. Los otros dos no
 * llevan aviso — lo que tenían que decir ya lo dice su descripción
 * (`FLOW_DESCRIPTIONS`), y una alerta que repite la línea de arriba solo estorba.
 */
export function InheritedFieldsNotice({
  flow,
  inheritedFields,
  ownRequiredCount,
  onGoToContactFlow,
}: {
  flow: FormFlow;
  /** Campos de `contact_registration` (solo relevantes en `order_intake`). */
  inheritedFields: EditableFormField[];
  ownRequiredCount: number;
  onGoToContactFlow: () => void;
}) {
  if (flow !== "order_intake" || inheritedFields.length === 0) {
    return null;
  }

  const inheritedRequired = inheritedFields.filter((field) => field.required).length;
  const totalRequired = inheritedRequired + ownRequiredCount;

  return (
    <div className="space-y-2 rounded-xl border border-border bg-secondary/40 p-3">
      <p className="text-sm font-medium">Antes, tu agente pedirá los datos del cliente</p>

      <ul className="flex flex-wrap gap-1.5">
        {inheritedFields.map((field) => (
          <li key={field.key}>
            <Badge variant="outline" className="gap-1.5 font-normal">
              <FieldTypeIcon type={field.type} className="size-3" />
              {field.label.trim() === "" ? "Dato sin nombre" : field.label}
            </Badge>
          </li>
        ))}
      </ul>

      {/* El dato que el tenant realmente quiere: un solo número con la verdad completa. */}
      <p className="text-xs text-muted-foreground">
        {totalRequired === 0
          ? "Ningún dato es obligatorio para cerrar un pedido."
          : `Para cerrar un pedido tu agente necesita ${totalRequired} ${
              totalRequired === 1 ? "dato obligatorio" : "datos obligatorios"
            }: ${inheritedRequired} del cliente + ${ownRequiredCount} del pedido.`}
      </p>

      <button
        type="button"
        onClick={onGoToContactFlow}
        className="text-sm text-brand underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        Editar {FLOW_LABELS.contact_registration.toLowerCase()} →
      </button>
    </div>
  );
}
