"use client";

import { CircleAlert, CircleCheck, CircleDashed, CircleDot, Clock3, type LucideIcon } from "lucide-react";

import { cn } from "@/core/lib/utils";
import {
  topicState,
  type IntakeProgress,
  type TopicProgress,
  type TopicTone,
} from "@/modules/intake/domain/intake";

/**
 * El avance de la entrevista: UN contador principal, el de los datos
 * esenciales confirmados DE VERDAD (informe de la entrevista, rec. 9). Antes la
 * barra era una cápsula por tema cuyo estado solo se sabía por el color y un
 * `title=` invisible al tacto (rec. 10, «los segmentos morados y blancos no eran
 * claros»): ahora la cifra se lee y la barra solo la acompaña.
 *
 * Lo encontrado en la web no sube la barra hasta que alguien dice «así es»: la
 * precarga no puede parecer trabajo terminado por la persona.
 */
export function SetupProgress({
  progress,
  counts,
  className,
}: {
  progress: IntakeProgress;
  counts: { review: number; undefined: number; notApplicable: number };
  className?: string;
}) {
  const { confirmed, total } = progress.essential;
  const percent = total === 0 ? 100 : Math.round((confirmed / total) * 100);
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="text-[14px] text-foreground">
        <b className="text-[15px] font-semibold tabular-nums">
          {confirmed} de {total}
        </b>{" "}
        datos esenciales confirmados
      </p>
      <span
        className="h-1.5 overflow-hidden rounded-full bg-foreground/10"
        role="progressbar"
        aria-label="Datos esenciales confirmados"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={confirmed}
      >
        <i
          className="block h-full rounded-full bg-accent-violet transition-[width] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{ width: `${String(percent)}%` }}
        />
      </span>
      {counts.review + counts.undefined + counts.notApplicable > 0 ? (
        <p className="flex flex-wrap gap-x-3.5 gap-y-1 text-[12.5px] text-muted-foreground">
          {counts.review > 0 ? (
            <span className="inline-flex items-center gap-1">
              <CircleAlert className="size-3.5 text-warning" aria-hidden="true" />
              {counts.review} por revisar
            </span>
          ) : null}
          {counts.undefined > 0 ? (
            <span className="inline-flex items-center gap-1">
              <CircleDashed className="size-3.5" aria-hidden="true" />
              {counts.undefined} por definir
            </span>
          ) : null}
          {counts.notApplicable > 0 ? (
            <span>
              {counts.notApplicable} no {counts.notApplicable === 1 ? "aplica" : "aplican"}
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

const TONE_ICON: Record<TopicTone, { icon: LucideIcon; className: string }> = {
  done: { icon: CircleCheck, className: "text-success" },
  now: { icon: CircleDot, className: "text-accent-violet" },
  review: { icon: CircleAlert, className: "text-warning" },
  waiting: { icon: CircleDashed, className: "text-muted-foreground/60" },
  deferred: { icon: Clock3, className: "text-muted-foreground/60" },
};

/** El icono del estado de un tema: forma Y color, nunca solo color (rec. 10). */
export function TopicStateIcon({ tone, className }: { tone: TopicTone; className?: string }) {
  const { icon: Icon, className: color } = TONE_ICON[tone];
  return <Icon className={cn("size-4 flex-none", color, className)} aria-hidden="true" />;
}

/**
 * Los temas, con su nombre ENTERO (dos líneas si hace falta; antes se cortaban
 * con puntos suspensivos, rec. 12) y su estado en palabras. «Luego» desaparece:
 * se leía como un estado (rec. 13). Posponer vive en el bloque «Ahora», como
 * verbo y con su efecto dicho; aquí solo se retoma lo pospuesto.
 */
export function SetupTopicList({
  progress,
  onResume,
  readOnly = false,
  className,
}: {
  progress: IntakeProgress;
  onResume: (code: string) => void;
  /** Sesión terminada: ya no hay nada que retomar. */
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <ul className={cn("grouped-list shadow-float", className)}>
      {progress.topics.map((topic) => (
        <TopicRow key={topic.code} topic={topic} onResume={onResume} readOnly={readOnly} />
      ))}
    </ul>
  );
}

function TopicRow({
  topic,
  onResume,
  readOnly,
}: {
  topic: TopicProgress;
  onResume: (code: string) => void;
  readOnly: boolean;
}) {
  const state = topicState(topic);
  return (
    <li className="grouped-row flex items-start gap-3 py-[11px] pr-3.5 pl-4">
      <TopicStateIcon tone={state.tone} className="mt-[3px]" />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "line-clamp-2 block text-[14.5px] leading-snug font-medium tracking-[-0.005em]",
            state.tone === "deferred" ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {topic.title}
        </span>
        <span className="mt-0.5 block text-[12px] text-muted-foreground">{state.label}</span>
      </span>
      {readOnly || state.tone !== "deferred" ? null : (
        <button
          type="button"
          onClick={() => {
            onResume(topic.code);
          }}
          className="flex-none pt-0.5 text-[12.5px] font-semibold text-foreground underline-offset-4 transition-opacity hover:underline active:opacity-60"
        >
          Retomar
        </button>
      )}
    </li>
  );
}
