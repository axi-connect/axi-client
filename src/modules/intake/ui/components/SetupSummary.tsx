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
 * La ficha viva, con la forma de Contactos: título grande, secciones con
 * cabecera en mayúsculas pequeñas, y las filas agrupadas en tarjetas blancas
 * sobre el suelo gris.
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
  const deferred = new Set(progress.topics.filter((topic) => topic.deferred).map((topic) => topic.code));

  return (
    <aside className={cn("flex min-h-0 flex-col", className)}>
      <header className="flex-none px-[22px] pt-5 pb-3">
        <h2 className="text-[22px] leading-[1.15] font-semibold tracking-[-0.025em] text-foreground">
          Lo que ya sabemos
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {filled} de {total} datos · toca cualquiera para corregirlo
        </p>
      </header>

      {pending.length > 0 ? (
        <div className="mx-5 mt-1.5 mb-1 flex flex-none items-start gap-2.5 rounded-[14px] bg-accent-violet/9 px-3.5 py-3">
          <Sparkles className="mt-0.5 size-[13px] flex-none fill-current text-accent-violet" aria-hidden="true" />
          <p className="text-[13px] leading-[1.45] text-foreground">
            {pending.length === 1
              ? "Un dato lo saqué de su página web y falta que lo confirmes."
              : `${String(pending.length)} datos los saqué de su página web y falta que los confirmes.`}
          </p>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-2 pb-7">
        {topics.map((topic) => (
          <section key={topic.code} className="mt-[22px] first:mt-2.5">
            <h3 className="mb-2 px-4 text-[12.5px] font-medium tracking-[0.03em] text-muted-foreground uppercase">
              {topic.title}
              {deferred.has(topic.code) ? (
                <span className="ml-1.5 tracking-normal normal-case text-muted-foreground/60">
                  para después
                </span>
              ) : null}
            </h3>
            <ul className="intake-card overflow-hidden">
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

        <section className="mt-[22px]">
          <h3 className="mb-2 px-4 text-[12.5px] font-medium tracking-[0.03em] text-muted-foreground uppercase">
            Temas
          </h3>
          <SetupTopicList progress={progress} onDefer={onDefer} onResume={onResume} />
        </section>
      </div>
    </aside>
  );
}
