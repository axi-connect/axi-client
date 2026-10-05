"use client";

import { memo, useEffect, useRef, useState, type Ref } from "react";
import { Check, Clock3, Database, Globe, Layers, PenLine } from "lucide-react";

import { cn } from "@/core/lib/utils";
import {
  draftOf,
  isEditableInline,
  valueFromDraft,
  type IntakeField,
} from "@/modules/intake/domain/intake";
import type { ReviewResolved } from "@/modules/intake/infrastructure/stores/intake.store";
import { AssistantBubble, AssistantListenButton } from "@/shared/components/features/assistant";
import { FieldEditor } from "./SetupFieldRow";

/** De dónde salió el dato, en palabras de la persona, con su icono. */
export function originOf(field: Pick<IntakeField, "source">): { text: string; icon: typeof Globe } {
  if (field.source === "proposed") return { text: "Lo propuse para tu tipo de negocio", icon: Layers };
  if (field.source === "known") return { text: "Ya lo teníamos", icon: Database };
  return { text: "Lo vi en su web", icon: Globe };
}

/** La línea de Alba sobre el dato: corta, y con la pregunta que pide un sí o un no. */
export function reviewLine(field: Pick<IntakeField, "source">): string {
  return field.source === "proposed" ? "Lo propuse por tu tipo de negocio. ¿Te sirve?" : "Lo vi en su web. ¿Es así?";
}

interface SetupReviewCardProps {
  field: IntakeField;
  assistantName: string;
  saving: boolean;
  /** Cuántos van revisados de cuántos había: «3 de 11 revisados». */
  reviewed: number;
  total: number;
  onConfirm: (field: IntakeField) => void;
  onCorrect: (field: IntakeField, value: unknown) => Promise<boolean>;
  /** Un dato que no se edita en una línea (un horario, unas preguntas) se corrige hablando. */
  onAskAbout: (field: IntakeField) => void;
  onLater: (field: IntakeField) => void;
  onDeferAll: () => void;
  onListen: () => void;
  /** La isla toma esta tarjeta cuando no está a la vista. */
  cardRef?: Ref<HTMLDivElement>;
}

/**
 * La tarjeta de revisión: el paso 1 del informe de la entrevista («Revisa lo que
 * encontramos»). El dato aparece JUNTO a sus acciones, con su origen y tres
 * botones con texto —«Así es», «Corregir», «Después»— que responden al
 * pulsarlos (rec. 1, 2 y 3). Nada de esto gasta un turno ni llama al modelo:
 * cada toque es un `PATCH`, y la siguiente tarjeta sale al instante.
 *
 * «Después» no descarta: el dato sigue pendiente, no se aplica, y espera en la
 * revisión final. No equivale a «no aplica».
 */
export const SetupReviewCard = memo(function SetupReviewCard({
  field,
  assistantName,
  saving,
  reviewed,
  total,
  onConfirm,
  onCorrect,
  onAskAbout,
  onLater,
  onDeferAll,
  onListen,
  cardRef,
}: SetupReviewCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const origin = originOf(field);
  const OriginIcon = origin.icon;
  const line = reviewLine(field);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const startCorrect = () => {
    if (!isEditableInline(field.kind)) {
      onAskAbout(field);
      return;
    }
    setDraft(draftOf(field));
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    const value = valueFromDraft(field, draft);
    if (value === null) {
      setError("No pude entender ese valor.");
      return;
    }
    const ok = await onCorrect(field, value);
    if (ok) setEditing(false);
    else setError("No se pudo guardar. Inténtalo de nuevo.");
  };

  const percent = total === 0 ? 0 : Math.round((reviewed / total) * 100);

  return (
    <AssistantBubble
      ref={cardRef}
      name={assistantName}
      body={line}
      fresh
      aside={
        <AssistantListenButton
          id={`review-${field.code}`}
          text={`${line} ${field.label}: ${field.display ?? ""}.`}
          onListen={onListen}
        />
      }
    >
      <div className="px-4 pb-4">
        <div className="grid gap-0.5 rounded-2xl bg-secondary px-3.5 py-3">
          <span className="text-[12px] text-muted-foreground">{field.label}</span>
          <span className="text-[15px] leading-snug wrap-anywhere text-foreground">{field.display}</span>
          <span className="mt-1 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <OriginIcon className="size-3" aria-hidden="true" />
            {origin.text}
          </span>
        </div>

        {editing ? (
          <div className="mt-3">
            <FieldEditor
              field={field}
              draft={draft}
              setDraft={setDraft}
              inputRef={inputRef}
              onCommit={() => void save()}
            />
            {error === null ? null : <p className="mt-1.5 text-[12px] text-destructive">{error}</p>}
            <div className="mt-2.5 flex flex-wrap gap-2">
              <ReviewButton strong disabled={saving} onClick={() => void save()}>
                <Check className="size-[15px]" aria-hidden="true" />
                Guardar
              </ReviewButton>
              <ReviewButton
                quiet
                disabled={saving}
                onClick={() => {
                  setEditing(false);
                  setError(null);
                }}
              >
                Cancelar
              </ReviewButton>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <ReviewButton
              strong
              disabled={saving}
              onClick={() => {
                onConfirm(field);
              }}
            >
              <Check className="size-[15px]" aria-hidden="true" />
              Así es
            </ReviewButton>
            <ReviewButton disabled={saving} onClick={startCorrect}>
              <PenLine className="size-[15px]" aria-hidden="true" />
              Corregir
            </ReviewButton>
            <ReviewButton
              quiet
              disabled={saving}
              onClick={() => {
                onLater(field);
              }}
            >
              <Clock3 className="size-[15px]" aria-hidden="true" />
              Después
            </ReviewButton>
          </div>
        )}

        <div className="mt-3.5 flex items-center gap-2.5 text-[12px] text-muted-foreground">
          <span className="tabular-nums">
            {reviewed} de {total} revisados
          </span>
          <span
            className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/10"
            role="progressbar"
            aria-label="Revisados"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={reviewed}
          >
            <i className="block h-full rounded-full bg-foreground" style={{ width: `${String(percent)}%` }} />
          </span>
          <button
            type="button"
            onClick={onDeferAll}
            className="flex-none font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Revisar el resto después
          </button>
        </div>
      </div>
    </AssistantBubble>
  );
});

/** Una tarjeta ya resuelta en esta visita: dice cómo quedó y deja cambiarla en la ficha. */
export const SetupReviewDone = memo(function SetupReviewDone({
  entry,
  assistantName,
}: {
  entry: ReviewResolved;
  assistantName: string;
}) {
  const state =
    entry.outcome === "confirmed"
      ? { text: "Confirmado", icon: Check, tone: "text-success bg-success/12" }
      : entry.outcome === "corrected"
        ? { text: "Corregido", icon: PenLine, tone: "text-success bg-success/12" }
        : { text: "Para después", icon: Clock3, tone: "text-muted-foreground bg-secondary" };
  const Icon = state.icon;
  return (
    <AssistantBubble name={assistantName} body="">
      <div className="flex flex-wrap items-center gap-2 px-4 pt-2 pb-3.5 text-[13px]">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold", state.tone)}>
          <Icon className="size-3.5" aria-hidden="true" />
          {state.text}
        </span>
        <span className="min-w-0 text-muted-foreground">
          <b className="font-medium text-foreground">{entry.label}</b>
          {entry.display === null || entry.outcome === "later" ? null : ` · ${entry.display}`}
          {entry.outcome === "later" ? " · te lo muestro en la revisión final" : null}
        </span>
      </div>
    </AssistantBubble>
  );
});

function ReviewButton({
  strong = false,
  quiet = false,
  disabled,
  onClick,
  children,
}: {
  strong?: boolean;
  quiet?: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-[38px] items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold whitespace-nowrap transition-[background-color,transform] active:scale-[.97] disabled:opacity-50",
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
