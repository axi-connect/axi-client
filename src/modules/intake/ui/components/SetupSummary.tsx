"use client";

import { memo, useState } from "react";
import { ChevronDown, ChevronRight, Clock3, Send } from "lucide-react";

import { cn } from "@/core/lib/utils";
import {
  currentTopic,
  fichaCounts,
  reviewQueue,
  topicState,
  type IntakeField,
  type IntakeProgress,
  type IntakeSkipReason,
  type IntakeTopicView,
} from "@/modules/intake/domain/intake";
import { SetupFieldRow } from "./SetupFieldRow";
import { SetupProgress, SetupTopicList, TopicStateIcon } from "./SetupProgress";

/**
 * La ficha, compacta (informe de la entrevista, rec. 11: «demasiada
 * información, campos vacíos y una agrupación poco evidente»). Primero lo que
 * hace falta para seguir —el avance, lo que toca ahora y lo pendiente—, y el
 * detalle completo tras «Ver todo lo anotado».
 *
 * Sigue siendo la mitad del diseño: todo se puede corregir aquí sin hablar con
 * nadie, sin gastar turno ni IA. Lo que cambia es el orden: el documento
 * entero ya no se impone a quien solo quería saber en qué va.
 */
export const SetupSummary = memo(function SetupSummary({
  topics,
  progress,
  savingField,
  onSave,
  onConfirm,
  onAskAbout,
  onSkip,
  onUnskip,
  onDefer,
  onResume,
  onReviewPending,
  onOpenFinalReview,
  readOnly = false,
  className,
}: {
  topics: IntakeTopicView[];
  progress: IntakeProgress;
  savingField: string | null;
  onSave: (field: IntakeField, value: unknown) => Promise<boolean>;
  onConfirm: (field: IntakeField) => void;
  onAskAbout: (field: IntakeField) => void;
  onSkip: (field: IntakeField, reason: IntakeSkipReason) => void;
  onUnskip: (field: IntakeField) => void;
  onDefer: (code: string) => void;
  onResume: (code: string) => void;
  /** Llevar a revisar lo encontrado (la tarjeta del hilo, o la revisión final). */
  onReviewPending?: () => void;
  /** «Revisar y enviar»: la revisión final. */
  onOpenFinalReview?: () => void;
  /**
   * La conversación terminó: la ficha se relee, no se corrige. El servidor
   * rechaza toda escritura sobre una sesión cerrada, así que ofrecer «Así es» o
   * la edición aquí solo produciría un «No se pudo guardar».
   */
  readOnly?: boolean;
  className?: string;
}) {
  const counts = fichaCounts(topics, progress);
  const pending = readOnly ? [] : reviewQueue(topics);
  const derived = pending.filter((field) => field.source === "derived").length;
  const proposed = pending.length - derived;
  const deferred = new Set(progress.topics.filter((topic) => topic.deferred).map((topic) => topic.code));
  const now = readOnly ? null : currentTopic(progress);
  const [showAll, setShowAll] = useState(readOnly);
  const expanded = showAll || readOnly;

  return (
    <aside className={cn("setup-ficha flex min-h-0 flex-col", className)}>
      <header className="flex-none px-[22px] pt-5 pb-3">
        <h2 className="text-[22px] leading-[1.15] font-heading font-bold tracking-[-0.02em] text-foreground">
          Tu avance
        </h2>
        {readOnly ? <p className="mt-1 text-[13px] text-muted-foreground">La conversación ya terminó.</p> : null}
        <SetupProgress progress={progress} counts={counts} className="mt-3" />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-1 pb-7">
        {pending.length > 0 && onReviewPending !== undefined ? (
          // El aviso de lo pendiente LLEVA a la acción (figura 3 del informe:
          // «avisaba que faltaba confirmar sin llevar a la acción»).
          <div className="mt-1.5 flex items-center gap-3 rounded-[14px] bg-warning/10 px-3.5 py-3">
            <p className="min-w-0 flex-1 text-[13px] leading-[1.45] text-foreground">{pendingNotice(derived, proposed)}</p>
            <button
              type="button"
              onClick={onReviewPending}
              className="flex-none rounded-full bg-foreground px-3.5 py-1.5 text-[12.5px] font-semibold text-background transition-transform active:scale-[.96]"
            >
              Revisar
            </button>
          </div>
        ) : null}

        {now === null ? null : (
          <section className="mt-5" aria-labelledby="ficha-now">
            <h3 id="ficha-now" className="mb-2 px-1 text-[11.5px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
              Ahora
            </h3>
            <div className="rounded-2xl bg-background px-4 py-3.5 shadow-float">
              <p className="text-[15px] leading-snug font-semibold text-foreground">{now.title}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                <TopicStateIcon tone={topicState(now).tone} className="size-3.5" />
                {topicState(now).label}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onDefer(now.code);
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-foreground ring-1 ring-border transition-[background-color,transform] hover:bg-foreground/[0.04] active:scale-[.97]"
                >
                  <Clock3 className="size-3.5" aria-hidden="true" />
                  Posponer tema
                </button>
                <span className="text-[11.5px] text-muted-foreground">Vuelve al final de la lista</span>
              </div>
            </div>
          </section>
        )}

        <section className="mt-5" aria-labelledby="ficha-topics">
          <h3 id="ficha-topics" className="mb-2 px-1 text-[11.5px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
            Temas
          </h3>
          <SetupTopicList progress={progress} onResume={onResume} readOnly={readOnly} />
        </section>

        {readOnly ? null : (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => {
              setShowAll((value) => !value);
            }}
            className="mt-4 flex w-full items-center justify-between rounded-[14px] bg-background px-4 py-3 text-[14px] font-semibold text-foreground shadow-float transition-colors hover:bg-foreground/[0.02]"
          >
            Ver todo lo anotado
            {expanded ? (
              <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
            )}
          </button>
        )}

        {expanded
          ? topics.map((topic) => (
              <section key={topic.code} className="mt-[22px] first:mt-2.5">
                <h3 className="mb-2 px-4 text-[12.5px] font-medium tracking-[0.03em] text-muted-foreground uppercase">
                  {topic.title}
                  {deferred.has(topic.code) ? (
                    <span className="ml-1.5 tracking-normal normal-case text-muted-foreground/60">pospuesto</span>
                  ) : null}
                </h3>
                <ul className="grouped-list shadow-float">
                  {topic.fields.map((field) => (
                    <SetupFieldRow
                      key={field.code}
                      field={field}
                      saving={savingField === field.code}
                      readOnly={readOnly}
                      onSave={onSave}
                      onConfirm={onConfirm}
                      onAskAbout={onAskAbout}
                      onSkip={onSkip}
                      onUnskip={onUnskip}
                    />
                  ))}
                </ul>
              </section>
            ))
          : null}

        {readOnly || onOpenFinalReview === undefined ? null : (
          <button
            type="button"
            onClick={onOpenFinalReview}
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-[14px] font-semibold text-background transition-[background-color,transform] hover:bg-foreground/90 active:scale-[.98]"
          >
            <Send className="size-[15px]" aria-hidden="true" />
            Revisar y enviar
          </button>
        )}
      </div>
    </aside>
  );
});

/**
 * El aviso de lo pendiente, sin mentir sobre el origen: lo de la web «lo
 * saqué», lo del nicho «lo propuse». Si hay de los dos, dos frases.
 */
export function pendingNotice(derived: number, proposed: number): string {
  const parts: string[] = [];
  if (derived > 0) {
    parts.push(
      derived === 1
        ? "Un dato lo saqué de su página web y falta que lo confirmes."
        : `${String(derived)} datos los saqué de su página web y falta que los confirmes.`,
    );
  }
  if (proposed > 0) {
    parts.push(
      proposed === 1
        ? "Un dato lo propuse por tu tipo de negocio y falta que lo revises."
        : `${String(proposed)} datos los propuse por tu tipo de negocio y falta que los revises.`,
    );
  }
  return parts.join(" ");
}
