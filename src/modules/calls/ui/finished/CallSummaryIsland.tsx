import { Sparkles } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { InkIsland, Kicker } from "@/shared/components/features/bento";
import {
  callResultPill,
  confidenceLabel,
  isInboundMessage,
  parseGoalAssessment,
  summaryWaitRemainingMs,
  type CallSessionDetailDTO,
} from "@/modules/calls/domain/call";
import { stageEntries, stageProgress } from "@/modules/calls/domain/live-call";
import { StageMeter } from "@/modules/calls/ui/components/StageMeter";
import { StageTimeline } from "@/modules/calls/ui/components/StageTimeline";

/**
 * «Así fue la llamada» (canvas, tablero 6): la isla de la vista — cristal con
 * brillo de IA, porque lo escribe Axi. El resultado de titular, el resumen
 * del postprocess y el veredicto del juez de objetivo con su porqué. Mientras
 * el resumen no llega (el evento `call.summary_ready` recarga el detalle) lo
 * dice con calma; una llamada sin conversación no tiene isla.
 */
export function CallSummaryIsland({ call, className }: { call: CallSessionDetailDTO; className?: string }) {
  const assessment = parseGoalAssessment(call.events);
  // Plan de modos §4: hasta dónde llegó una proactiva y, si no cumplió, dónde se cortó.
  // Solo `last_stage`: el servidor la escribe al CONTESTAR. `stage_route` trae
  // sembrada la primera etapa desde el timbre, y una no contestada (buzón, no
  // contestó) no «llegó» a nada — el embudo tampoco la cuenta (auditoría A1).
  const goalMet = call.outcome === "goal_met" || assessment?.met === true;
  const progress = stageProgress(call.playbook?.stages ?? [], call.last_stage, {
    goalMet,
    finished: true,
    entries: stageEntries(call.events),
  });
  const reached = progress === null ? null : (progress.steps[progress.reachedIndex] ?? null);
  // F-1: la ruta se muestra aunque no haya resumen ni veredicto — «dónde se
  // cortó» es justo lo que el dueño viene a buscar en una llamada sin resumen.
  const hadConversation = call.segments.some((segment) => segment.role !== "system");
  if (reached === null && call.summary === null && assessment === null && !hadConversation) return null;
  // Sin resumen pasado el rato, el postprocess no lo va a escribir: no se promete.
  const pending = summaryWaitRemainingMs(call, Date.now()) > 0;
  if (reached === null && call.summary === null && assessment === null && !pending) return null;
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
      {progress !== null && reached !== null && (
        <div className="mt-1 flex flex-col gap-3 rounded-2xl border border-border/60 bg-foreground/[0.03] p-3.5">
          {/* Una sola fila: si no cumplió, la etapa a la que llegó ES donde se cortó (B3). */}
          <div className="flex items-baseline justify-between gap-3">
            <dl className="flex min-w-0 items-baseline gap-2 text-sm">
              <dt className="shrink-0 text-muted-foreground">{reached.state === "fell" ? "Se cortó en" : "Llegó a"}</dt>
              <dd className="min-w-0 font-semibold">{reached.label}</dd>
            </dl>
            <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
              {progress.reachedIndex + 1} de {progress.total}
            </span>
          </div>
          <StageMeter steps={progress.steps} label={progress.position} />
          <StageTimeline steps={progress.steps} label="Etapas que recorrió la llamada" className="mt-1" />
        </div>
      )}
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
        {/* La tarea solo existe si hay a quién devolver la llamada: un número
            oculto no tiene contacto y no tiene tarea (B1 de F4). */}
        {isInboundMessage(call)
          ? call.contact !== null
            ? "Recado transcrito por Axi · la tarea «Devolver llamada» quedó en el CRM"
            : "Recado transcrito por Axi · número oculto: no hay a quién devolver la llamada"
          : "Resumen escrito por Axi al colgar"}
      </p>
    </InkIsland>
  );
}
