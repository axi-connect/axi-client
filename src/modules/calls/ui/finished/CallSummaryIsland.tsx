import { Sparkles } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { InkIsland, Kicker } from "@/shared/components/features/bento";
import {
  callResultPill,
  confidenceLabel,
  parseGoalAssessment,
  type CallSessionDetailDTO,
} from "@/modules/calls/domain/call";

/**
 * «Así fue la llamada» (canvas, tablero 6): la isla de la vista — cristal con
 * brillo de IA, porque lo escribe Axi. El resultado de titular, el resumen
 * del postprocess y el veredicto del juez de objetivo con su porqué. Mientras
 * el resumen no llega (el evento `call.summary_ready` recarga el detalle) lo
 * dice con calma; una llamada sin conversación no tiene isla.
 */
export function CallSummaryIsland({ call, className }: { call: CallSessionDetailDTO; className?: string }) {
  const assessment = parseGoalAssessment(call.events);
  const hadConversation = call.segments.some((segment) => segment.role !== "system");
  if (call.summary === null && assessment === null && !hadConversation) return null;
  // Sin resumen pasado el rato, el postprocess no lo va a escribir: no se promete.
  const pending =
    call.summary === null &&
    call.ended_at !== null &&
    Date.now() - new Date(call.ended_at).getTime() < 10 * 60_000;
  if (call.summary === null && assessment === null && !pending) return null;
  const result = callResultPill(call);

  return (
    <InkIsland label="Así fue la llamada" glow="ai" className={cn("gap-3", className)}>
      <Kicker>Así fue la llamada</Kicker>
      <h2 className="font-heading text-2xl leading-tight font-bold tracking-tight text-balance">{result.label}</h2>
      {call.summary !== null ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{call.summary}</p>
      ) : pending ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Axi está escribiendo el resumen. Aparece aquí en cuanto esté listo.
        </p>
      ) : null}
      {assessment !== null && (
        <ul className="mt-1 divide-y divide-border">
          <li className="flex items-start gap-3 py-3">
            <span
              aria-hidden
              className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", assessment.met ? "bg-success" : "bg-muted-foreground")}
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-semibold">
                {assessment.met ? "Meta cumplida" : "La meta no se cumplió"} · {confidenceLabel(assessment.confidence)}
              </span>
              <span className="text-xs text-muted-foreground">{assessment.reason}</span>
            </span>
          </li>
        </ul>
      )}
      <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles aria-hidden className="size-3.5" />
        Resumen escrito por Axi al colgar
      </p>
    </InkIsland>
  );
}
