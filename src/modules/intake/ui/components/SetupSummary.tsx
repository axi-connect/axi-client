"use client";

import { cn } from "@/core/lib/utils";
import {
  countCaptured,
  pendingConfirmations,
  type IntakeField,
  type IntakeProgress,
  type IntakeTopicView,
} from "@/modules/intake/domain/intake";
import { AssistantMark } from "@/shared/components/features/assistant";
import { SetupFieldRow } from "./SetupFieldRow";
import { SetupProgress, SetupTopicList } from "./SetupProgress";

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
  onSkip,
  onUnskip,
  onDefer,
  onResume,
  readOnly = false,
  className,
}: {
  topics: IntakeTopicView[];
  progress: IntakeProgress;
  savingField: string | null;
  onSave: (field: IntakeField, value: unknown) => Promise<boolean>;
  onConfirm: (field: IntakeField) => void;
  onAskAbout: (field: IntakeField) => void;
  onSkip: (field: IntakeField) => void;
  onUnskip: (field: IntakeField) => void;
  onDefer: (code: string) => void;
  onResume: (code: string) => void;
  /**
   * La conversación terminó: la ficha se relee, no se corrige. El servidor
   * rechaza toda escritura sobre una sesión cerrada, así que ofrecer «Así es» o
   * la edición aquí solo produciría un «No se pudo guardar».
   */
  readOnly?: boolean;
  className?: string;
}) {
  const { filled, skipped, total } = countCaptured(topics);
  const pending = readOnly ? [] : pendingConfirmations(topics);
  // N6: lo deducido de la web y lo propuesto por el tipo de negocio no salen
  // del mismo sitio, y el aviso no puede decir «de su página web» de algo que
  // salió del preset del nicho.
  const derived = pending.filter((field) => field.source === "derived").length;
  const proposed = pending.length - derived;
  const deferred = new Set(progress.topics.filter((topic) => topic.deferred).map((topic) => topic.code));

  return (
    <aside className={cn("flex min-h-0 flex-col", className)}>
      <header className="flex-none px-[22px] pt-5 pb-3">
        <h2 className="text-[22px] leading-[1.15] font-heading font-bold tracking-[-0.02em] text-foreground">
          Lo que ya sabemos
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {filled} de {total} datos
          {skipped > 0 ? ` · ${String(skipped)} no ${skipped === 1 ? "aplica" : "aplican"}` : ""}
          {" · "}
          {readOnly ? "la conversación ya terminó" : "toca cualquiera para corregirlo"}
        </p>
        <SetupProgress progress={progress} className="mt-3.5" />
      </header>

      {pending.length > 0 ? (
        <div className="mx-5 mt-1.5 mb-1 flex flex-none items-start gap-2.5 rounded-[14px] bg-accent-violet/9 px-3.5 py-3">
          <AssistantMark size="sm" className="mt-0.5" />
          <p className="text-[13px] leading-[1.45] text-foreground">{pendingNotice(derived, proposed)}</p>
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
            <ul className="grouped-list shadow-float">
              {topic.fields.map((field) => (
                <SetupFieldRow
                  key={field.code}
                  field={field}
                  saving={savingField === field.code}
                  readOnly={readOnly}
                  onSave={(value) => onSave(field, value)}
                  onConfirm={() => {
                    onConfirm(field);
                  }}
                  onAskAbout={onAskAbout}
                  onSkip={onSkip}
                  onUnskip={onUnskip}
                />
              ))}
            </ul>
          </section>
        ))}

        <section className="mt-[22px]">
          <h3 className="mb-2 px-4 text-[12.5px] font-medium tracking-[0.03em] text-muted-foreground uppercase">
            Temas
          </h3>
          <SetupTopicList progress={progress} onDefer={onDefer} onResume={onResume} readOnly={readOnly} />
        </section>
      </div>
    </aside>
  );
}

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
