"use client";

import { Check, Clock, Lock } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { useIntakeLadderQuery } from "../../../infrastructure/api/hooks/use-intake";

const STAGE_NAMES: Record<number, string> = {
  1: "Arranque",
  2: "Cómo vende",
  3: "Cómo opera",
};

/**
 * La escalera de tandas de un tenant.
 *
 * **Existe en lugar de un cron, y esa es su razón de ser.** Un guion único con
 * los cuarenta y pico datos que hacen falta no cabe: por encima de unas catorce
 * preguntas el formato conversacional empieza a jugar en contra, y la salida no
 * es subir el tope sino partirlo en tandas. Pero cuándo toca cada una es una
 * decisión de negocio —la segunda cuando el cliente ya tiene conversaciones
 * reales que meter en un embudo, la tercera cuando va a vender de verdad— y eso
 * no lo sabe un reloj. Lo mira una persona aquí y pulsa.
 *
 * Una tanda ya cerrada se puede volver a emitir (un cliente puede querer
 * repasarla) pero no se ofrece como «la siguiente».
 */
export function IntakeLadder({
  companyId,
  onPick,
}: {
  companyId: string;
  /** Elegir esta tanda: selecciona su guion en el formulario de arriba. */
  onPick: (blueprintId: string) => void;
}) {
  const ladder = useIntakeLadderQuery(companyId);

  if (companyId === "" || ladder.isPending || ladder.isError) return null;

  return (
    <section className="rounded-lg border border-border bg-secondary/30 p-3">
      <h4 className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        Dónde va este cliente
      </h4>
      <ol className="mt-2 space-y-1">
        {ladder.data.stages.map((stage) => {
          const closed =
            stage.status === "completed" || stage.status === "applied";
          const next = ladder.data.next_stage === stage.stage;
          return (
            <li
              key={stage.stage}
              className="flex items-center gap-2.5 text-[12.5px]"
            >
              <span
                className={cn(
                  "flex size-5 flex-none items-center justify-center rounded-full",
                  closed
                    ? "bg-success/15 text-success"
                    : next
                      ? "bg-accent-violet/15 text-accent-violet"
                      : "bg-secondary text-muted-foreground",
                )}
              >
                {closed ? (
                  <Check className="size-3" aria-hidden="true" />
                ) : stage.can_emit ? (
                  <Clock className="size-3" aria-hidden="true" />
                ) : (
                  <Lock className="size-3" aria-hidden="true" />
                )}
              </span>
              <span className={cn("flex-1", closed && "text-muted-foreground")}>
                {stage.blueprint_name ??
                  STAGE_NAMES[stage.stage] ??
                  `Tanda ${String(stage.stage)}`}
              </span>
              {stage.blocked_reason !== null ? (
                <span className="flex-none text-[11.5px] text-muted-foreground/70">
                  {stage.blocked_reason}
                </span>
              ) : stage.blueprint_id !== null ? (
                <button
                  type="button"
                  onClick={() => {
                    onPick(stage.blueprint_id!);
                  }}
                  className={cn(
                    "flex-none rounded-full px-2.5 py-0.5 text-[11.5px] font-medium transition-colors",
                    next
                      ? "bg-accent-violet/12 text-accent-violet hover:bg-accent-violet/20"
                      : "text-muted-foreground hover:bg-secondary",
                  )}
                >
                  {next ? "Emitir esta" : closed ? "Repetir" : "Elegir"}
                </button>
              ) : null}
            </li>
          );
        })}
      </ol>
      {ladder.data.next_stage === null ? (
        <p className="mt-2 text-[11.5px] text-muted-foreground">
          No queda tanda por emitir. Si hace falta repasar algo, repite la que
          corresponda.
        </p>
      ) : null}
    </section>
  );
}
