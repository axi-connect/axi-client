"use client";

import { Info } from "lucide-react";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import {
  FLOW_AI_LABELS,
  type EditableFormField,
  type FormFlow,
} from "@/modules/forms/domain/form";

/** Umbral a partir del cual la lista deja de ser un formulario y es un interrogatorio. */
const CROWDED_THRESHOLD = 5;

/**
 * Ejemplo de cómo se verá la captura en WhatsApp.
 *
 * Su valor NO es mostrar cómo suena una pregunta concreta (no sabemos qué dirá el
 * LLM, y por eso lleva disclaimer): es mostrar el **efecto acumulado**. Con 6
 * datos obligatorios el tenant ha construido un interrogatorio de aduana y no se
 * da cuenta hasta que lo ve seguido.
 *
 * Para `order_intake` muestra la CONCATENACIÓN con `contact_registration`, que es
 * lo que de verdad exige `create_order.tool.ts`.
 */
export function ConversationPreview({
  open,
  onOpenChange,
  flow,
  fields,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flow: FormFlow;
  /** Los campos EFECTIVOS del flujo (con los heredados ya concatenados). */
  fields: readonly EditableFormField[];
}) {
  const required = fields.filter((field) => field.required);
  const crowded = required.length >= CROWDED_THRESHOLD;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      id={flow}
      title="Cómo se verá en WhatsApp"
      subtitle={`Antes de ${FLOW_AI_LABELS[flow]}`}
      size="md"
    >
      <div className="space-y-4">
        <p className="rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
          Ejemplo aproximado: tu agente adapta cada pregunta a la conversación y agrupa lo que puede.
        </p>

        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Tu agente no pedirá ningún dato antes de {FLOW_AI_LABELS[flow]}.
          </p>
        ) : (
          <ol className="space-y-2">
            {fields.map((field) => (
              <li key={field.key} className="space-y-2">
                {/* Mismo vocabulario de burbuja que el inbox (MessageBubble). */}
                <div className="flex justify-start">
                  <p className="max-w-[75%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-foreground">
                    {questionFor(field)}
                  </p>
                </div>
                <div className="flex justify-end">
                  <p className="max-w-[75%] rounded-2xl rounded-br-sm bg-brand px-3 py-2 text-sm text-white">
                    {answerFor(field)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}

        {crowded && (
          // Neutro a propósito: no es un error y el ámbar está prohibido en esta
          // vista (el acento secundario es el violeta de IA).
          <div className="flex gap-2 rounded-xl bg-secondary px-3 py-2.5 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <p>
              {required.length} datos obligatorios son {required.length} preguntas antes de poder
              cobrar. Deja como opcionales los que puedas confirmar después.
            </p>
          </div>
        )}
      </div>
    </DetailSheet>
  );
}

/**
 * Pregunta de ejemplo. Se deriva del `ai_prompt` cuando existe (es la pista que
 * el tenant escribió) y si no del label — igual que hará el agente.
 */
function questionFor(field: EditableFormField): string {
  const hint = field.ai_prompt?.trim();
  if (hint !== undefined && hint !== "") return hint;

  const label = field.label.trim() === "" ? "ese dato" : field.label.toLowerCase();
  if (field.type === "select") {
    const options = (field.options ?? []).filter((option) => option.trim() !== "");
    if (options.length > 0) return `¿${label}? ${options.join(" o ")}`;
  }
  if (field.type === "boolean") return `¿${label}?`;
  return `¿Me confirmas ${label}?`;
}

/** Respuesta de ejemplo del cliente, plausible según el tipo. */
function answerFor(field: EditableFormField): string {
  switch (field.type) {
    case "phone":
      return "+57 320 123 4567";
    case "email":
      return "ana@correo.com";
    case "number":
      return "2";
    case "date":
      return "2026-08-12";
    case "boolean":
      return "Sí";
    case "select": {
      const options = (field.options ?? []).filter((option) => option.trim() !== "");
      return options[0] ?? "…";
    }
    default:
      return "Listo";
  }
}
