"use client";

import { Sparkles } from "lucide-react";

import { cn } from "@/core/lib/utils";
import {
  countCaptured,
  pendingConfirmations,
  type IntakeField,
  type IntakeProgress,
  type IntakeTopicView,
} from "@/modules/intake/domain/intake";
import { SetupFieldRow } from "./SetupFieldRow";
import { SetupTopicList } from "./SetupProgress";

/**
 * La ficha viva: todo lo que se sabe del negocio, siempre a la vista.
 *
 * **Es la pieza que hace que esto no se rompa con volumen.** Un chat que
 * recorre cuarenta datos de uno en uno se siente más largo que una página
 * entera y no deja ver el alcance, editar lo anterior ni saltar adelante. Con
 * la ficha al lado, la conversación pasa a ser un método de entrada cómodo para
 * un documento que siempre está completo a la vista.
 *
 * Y es una LISTA, no una tabla: etiqueta → valor, una línea secundaria, un solo
 * indicador, acciones al pasar el ratón.
 */
export function SetupSummary({
  topics,
  progress,
  savingField,
  onSave,
  onConfirm,
  onAskAbout,
  onDefer,
  onResume,
  className,
}: {
  topics: IntakeTopicView[];
  progress: IntakeProgress;
  savingField: string | null;
  onSave: (field: IntakeField, value: unknown) => Promise<boolean>;
  onConfirm: (field: IntakeField) => void;
  onAskAbout: (field: IntakeField) => void;
  onDefer: (code: string) => void;
  onResume: (code: string) => void;
  className?: string;
}) {
  const { filled, total } = countCaptured(topics);
  const pending = pendingConfirmations(topics);
  const deferred = new Set(
    progress.topics.filter((topic) => topic.deferred).map((topic) => topic.code),
  );

  return (
    <aside className={cn("flex min-h-0 flex-col", className)}>
      <header className="flex-none border-b border-border px-5 py-4">
        <h2 className="text-[13px] font-semibold text-foreground">Lo que ya sabemos de ti</h2>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
          {filled} de {total} datos · puedes corregir cualquiera
        </p>
      </header>

      {pending.length > 0 ? (
        <div className="flex-none border-b border-border bg-accent-violet/6 px-5 py-2.5">
          <p className="flex items-start gap-1.5 text-[11.5px] leading-snug text-muted-foreground">
            <Sparkles className="mt-0.5 size-3 flex-none text-accent-violet" aria-hidden="true" />
            <span>
              {pending.length === 1
                ? "Hay un dato que saqué de su página web y me falta que lo confirmes."
                : `Hay ${String(pending.length)} datos que saqué de su página web y me falta que los confirmes.`}
            </span>
          </p>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
        {topics.map((topic) => (
          <section key={topic.code} className="mb-5 last:mb-2">
            <h3
              className={cn(
                "mb-1 text-[10.5px] font-semibold tracking-[0.1em] uppercase",
                deferred.has(topic.code) ? "text-muted-foreground/50" : "text-muted-foreground/80",
              )}
            >
              {topic.title}
              {deferred.has(topic.code) ? " · para después" : ""}
            </h3>
            <ul className="flex flex-col">
              {topic.fields.map((field) => (
                <SetupFieldRow
                  key={field.code}
                  field={field}
                  saving={savingField === field.code}
                  onSave={(value) => onSave(field, value)}
                  onConfirm={() => {
                    onConfirm(field);
                  }}
                  onAskAbout={onAskAbout}
                />
              ))}
            </ul>
          </section>
        ))}

        <section className="mt-6 border-t border-border pt-3">
          <h3 className="mb-1 text-[10.5px] font-semibold tracking-[0.1em] text-muted-foreground/80 uppercase">
            Temas
          </h3>
          <SetupTopicList progress={progress} onDefer={onDefer} onResume={onResume} />
        </section>
      </div>
    </aside>
  );
}
