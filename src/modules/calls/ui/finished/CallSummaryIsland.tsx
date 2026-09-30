import { Sparkles } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { InkIsland, Kicker } from "@/shared/components/features/bento";
import {
  callResultPill,
  confidenceLabel,
  parseGoalAssessment,
  summaryWaitRemainingMs,
  type CallSessionDetailDTO,
} from "@/modules/calls/domain/call";
import { routeSteps } from "@/modules/calls/domain/live-call";
import { StageRoute } from "@/modules/calls/ui/components/StageRoute";

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
  const stages = call.playbook?.stages ?? [];
  const reachedKey = call.last_stage;
  const reachedIndex = stages.findIndex((stage) => stage.key === reachedKey);
  const reached = reachedIndex === -1 ? null : (stages[reachedIndex] ?? null);
  const goalMet = call.outcome === "goal_met" || assessment?.met === true;
  const fellAt = reached !== null && !goalMet && reachedIndex < stages.length - 1 ? reached.key : null;
  const steps = routeSteps(stages, reachedKey).map((step) =>
    step.state === "now" ? { ...step, state: "done" as const } : step,
  );
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
      {reached !== null && (
        <div className="mt-1 flex flex-col gap-2">
          <StageRoute steps={steps} fellAt={fellAt} label="Etapas que recorrió la llamada" />
          {/* Una sola fila: si no cumplió, la etapa a la que llegó ES donde se cortó (B3). */}
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">{fellAt === null ? "Llegó a" : "Se cortó en"}</dt>
            <dd className="font-medium">
              {reached.label} · {reachedIndex + 1} de {stages.length}
            </dd>
          </dl>
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
        Resumen escrito por Axi al colgar
      </p>
    </InkIsland>
  );
}
