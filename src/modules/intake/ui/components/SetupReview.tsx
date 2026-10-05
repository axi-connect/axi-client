"use client";

import { ArrowLeft, Check, CircleAlert, CircleDashed, Clock3, Minus, Plus, Send } from "lucide-react";

import { cn } from "@/core/lib/utils";
import {
  fichaCounts,
  reviewQueue,
  type IntakeField,
  type IntakeProgress,
  type IntakeSkipReason,
  type IntakeTopicView,
} from "@/modules/intake/domain/intake";
import { SetupFieldRow } from "./SetupFieldRow";

interface SetupReviewProps {
  topics: IntakeTopicView[];
  progress: IntakeProgress;
  savingField: string | null;
  finishing: boolean;
  finishError: string | null;
  onSave: (field: IntakeField, value: unknown) => Promise<boolean>;
  onConfirm: (field: IntakeField) => void;
  onAskAbout: (field: IntakeField) => void;
  onSkip: (field: IntakeField, reason: IntakeSkipReason) => void;
  onUnskip: (field: IntakeField) => void;
  onBack: () => void;
  onFinish: () => void;
}

/**
 * La revisión final, ANTES de terminar (informe de la entrevista, rec. 15; vista
 * 6 de la maqueta aprobada). Se abre al completar lo esencial o al pulsar
 * «Revisar y enviar», y es el único camino normal al cierre: el asistente ya no
 * cierra por su cuenta.
 *
 * Lo pendiente va ARRIBA, cada dato dice de dónde salió y cómo está, y cada uno
 * se edita aquí mismo (las mismas filas de la ficha, sin turno). El botón final
 * nombra su efecto: «Enviar a revisión». Nada pendiente se aplica, y la
 * pantalla lo dice.
 *
 * No choca con «el cierre se lee, no se corrige»: esto es PRE-cierre. Después de
 * enviar, `SetupDone` sigue en solo lectura.
 */
export function SetupReview({
  topics,
  progress,
  savingField,
  finishing,
  finishError,
  onSave,
  onConfirm,
  onAskAbout,
  onSkip,
  onUnskip,
  onBack,
  onFinish,
}: SetupReviewProps) {
  const counts = fichaCounts(topics, progress);
  const pending = reviewQueue(topics);
  const pendingCodes = new Set(pending.map((field) => field.code));
  const deferred = new Set(progress.topics.filter((topic) => topic.deferred).map((topic) => topic.code));
  const moreToAsk = progress.next_ask !== null;
  const row = (field: IntakeField) => (
    <SetupFieldRow
      key={field.code}
      field={field}
      saving={savingField === field.code}
      onSave={onSave}
      onConfirm={onConfirm}
      onAskAbout={onAskAbout}
      onSkip={onSkip}
      onUnskip={onUnskip}
    />
  );

  return (
    <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-[760px]">
        <h1 className="font-heading text-[28px] leading-[1.1] font-bold tracking-[-0.02em] text-foreground text-balance">
          Revisa antes de enviar
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Cada dato dice de dónde salió y si lo confirmaste. Puedes editar cualquiera.
        </p>

        <div className="mt-4 flex flex-wrap gap-2" aria-label="Resumen de la revisión">
          <Count tone="ok" icon={Check}>
            {counts.confirmed} de {counts.total} esenciales confirmados
          </Count>
          {counts.review > 0 ? (
            <Count tone="review" icon={CircleAlert}>
              {counts.review} por revisar
            </Count>
          ) : null}
          {counts.undefined > 0 ? (
            <Count icon={CircleDashed}>{counts.undefined} por definir</Count>
          ) : null}
          {counts.later > 0 ? <Count icon={Clock3}>{counts.later} para después</Count> : null}
          {counts.notApplicable > 0 ? (
            <Count icon={Minus}>
              {counts.notApplicable} no {counts.notApplicable === 1 ? "aplica" : "aplican"}
            </Count>
          ) : null}
        </div>

        {pending.length > 0 ? (
          <section className="mt-6" aria-labelledby="review-pending">
            <h2
              id="review-pending"
              className="mb-2 px-1 text-[12px] font-semibold tracking-[0.05em] text-warning uppercase"
            >
              Por revisar · {pending.length}
            </h2>
            <ul className="grouped-list shadow-float ring-1 ring-border">{pending.map(row)}</ul>
          </section>
        ) : null}

        {topics.map((topic) => {
          const fields = topic.fields.filter(
            (field) => !pendingCodes.has(field.code) && (field.value !== null || field.skipped !== null),
          );
          if (fields.length === 0) return null;
          return (
            <section key={topic.code} className="mt-6" aria-labelledby={`review-${topic.code}`}>
              <h2
                id={`review-${topic.code}`}
                className="mb-2 px-1 text-[12px] font-semibold tracking-[0.05em] text-muted-foreground uppercase"
              >
                {topic.title}
                {deferred.has(topic.code) ? (
                  <span className="ml-1.5 tracking-normal normal-case text-muted-foreground/70">· pospuesto</span>
                ) : null}
              </h2>
              <ul className="grouped-list shadow-float ring-1 ring-border">{fields.map(row)}</ul>
            </section>
          );
        })}

        <div className="mt-8 flex flex-wrap items-center gap-2.5">
          <FooterButton onClick={onBack}>
            <ArrowLeft className="size-[15px]" aria-hidden="true" />
            Volver a la entrevista
          </FooterButton>
          <span className="flex-1" />
          {moreToAsk && progress.essential.complete ? (
            <FooterButton quiet onClick={onBack}>
              <Plus className="size-[15px]" aria-hidden="true" />
              Añadir detalles (opcional)
            </FooterButton>
          ) : null}
          <FooterButton strong disabled={finishing} onClick={onFinish}>
            <Send className="size-[15px]" aria-hidden="true" />
            {finishing ? "Enviando…" : "Enviar a revisión"}
          </FooterButton>
        </div>
        <p
          className={cn(
            "mt-2.5 text-[12.5px] sm:text-right",
            finishError === null ? "text-muted-foreground" : "text-destructive",
          )}
          role="status"
          aria-live="polite"
        >
          {finishError ??
            (counts.review > 0
              ? "El equipo de axi lo revisa y lo deja aplicado en tu cuenta. Lo que esté por revisar no se aplica."
              : "El equipo de axi lo revisa y lo deja aplicado en tu cuenta.")}
        </p>
      </div>
    </div>
  );
}

function Count({
  tone,
  icon: Icon,
  children,
}: {
  tone?: "ok" | "review";
  icon: typeof Check;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold tabular-nums",
        tone === "ok"
          ? "bg-success/12 text-success"
          : tone === "review"
            ? "bg-warning/14 text-foreground"
            : "bg-secondary text-foreground",
      )}
    >
      <Icon className={cn("size-3.5", tone === "review" && "text-warning")} aria-hidden="true" />
      {children}
    </span>
  );
}

function FooterButton({
  strong = false,
  quiet = false,
  disabled = false,
  onClick,
  children,
}: {
  strong?: boolean;
  quiet?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-semibold transition-[background-color,transform] active:scale-[.97] disabled:opacity-60",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        strong
          ? "bg-foreground text-background hover:bg-foreground/90"
          : quiet
            ? "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
            : "bg-background text-foreground ring-1 ring-border hover:bg-foreground/[0.04]",
      )}
    >
      {children}
    </button>
  );
}
