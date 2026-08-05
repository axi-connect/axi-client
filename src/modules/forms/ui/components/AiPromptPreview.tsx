import { promptLine, type EditableFormField } from "@/modules/forms/domain/form";

/**
 * La línea EXACTA que el backend inyecta por campo en la sección
 * "## Datos requeridos" del prompt del turno.
 *
 * Es el antídoto contra el malentendido central de la feature: que `ai_prompt`
 * es la pregunta literal. Viéndolo en mono, con el `code`, el `[opcional]` y las
 * opciones como piezas separadas, se entiende de un golpe que lo que escribes es
 * una PISTA. Una burbuja de WhatsApp con "la pregunta" haría lo contrario: daría
 * por real algo que no sabemos qué dirá el LLM.
 *
 * El texto va en `muted-foreground`, no en violeta: `#7C3AED` sobre un tinte al
 * 5% no llega a 4.5:1 en light.
 */
export function AiPromptPreview({ field }: { field: EditableFormField }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
        Así lo lee tu agente
      </p>
      <pre className="overflow-x-auto rounded-xl border border-accent-violet/25 bg-accent-violet/5 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
        {promptLine(field)}
      </pre>
    </div>
  );
}
