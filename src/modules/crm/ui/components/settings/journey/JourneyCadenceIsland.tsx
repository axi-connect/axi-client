import { Sparkles } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { cadencePlan } from "@/modules/crm/domain/cadence-plan";
import type { JourneyStageDTO, JourneySwitches } from "@/modules/crm/domain/journey";
import { InkIsland } from "@/shared/components/features/bento";

const OUTCOME_DOT = {
  destructive: "border-destructive",
  neutral: "border-muted-foreground",
  warning: "border-warning",
} as const;

/**
 * «Así insiste el agente en {etapa}» (lienzo CRM premium F4 · Recorrido): la
 * cadencia contada como lo que va a pasar, con brillo `ai` porque habla lo
 * que hará el agente. La frase y la línea de tiempo salen de `cadencePlan`,
 * fiel al motor; los días son de calendario y el pie lo dice.
 */
export function JourneyCadenceIsland({
  stage,
  switches,
  className,
}: {
  /** La etapa abierta; si no hay ninguna, la primera con cadencia. */
  stage: JourneyStageDTO | null;
  switches: JourneySwitches;
  className?: string;
}) {
  const plan = stage === null ? null : cadencePlan(stage, switches);
  const label = stage === null ? "Así insiste el agente" : `Así insiste el agente en ${stage.name}`;

  return (
    <InkIsland label={label} glow="ai" className={cn("gap-4 p-5", className)}>
      <p className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium tracking-[0.12em] uppercase opacity-70">
        <Sparkles aria-hidden className="size-3 shrink-0 text-accent-violet" />
        <span className="truncate">{label}</span>
      </p>

      {plan === null ? (
        <p className="text-sm text-pretty text-muted-foreground">
          {stage === null
            ? "Ninguna etapa tiene cadencia: el agente no insiste por su cuenta. Abre una etapa y activa su cadencia."
            : `${stage.name} no tiene cadencia: aquí el agente no insiste por su cuenta.`}
        </p>
      ) : (
        <>
          <p className="font-heading text-xl leading-tight font-bold text-pretty">{plan.headline}</p>
          <ol className="flex flex-col">
            {[...plan.attempts, plan.outcome].map((mark, index, all) => {
              const last = index === all.length - 1;
              return (
                <li key={mark.title} className="grid grid-cols-[3.5rem_0.75rem_minmax(0,1fr)] gap-x-3">
                  <span className="pt-0.5 text-right text-xs whitespace-nowrap text-muted-foreground tabular-nums">{mark.at}</span>
                  <span aria-hidden className="flex flex-col items-center">
                    <span
                      className={cn(
                        "mt-1 size-3 shrink-0 rounded-full border-2",
                        last ? OUTCOME_DOT[plan.outcome.tone] : "border-accent-violet",
                      )}
                    />
                    {!last && <span className="my-1 w-0.5 flex-1 rounded-full bg-foreground/10" />}
                  </span>
                  <div className={cn("min-w-0", !last && "pb-3")}>
                    <p className="text-sm font-semibold">{mark.title}</p>
                    <p className="text-xs text-pretty text-muted-foreground">{mark.detail}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="border-t border-foreground/10 pt-3 text-xs text-pretty text-muted-foreground">
            Días de calendario: el horario silencioso y el tope diario de Tareas de agente pueden correr un intento.
            Si el contacto responde, la cadencia se detiene.
          </p>
        </>
      )}
    </InkIsland>
  );
}
