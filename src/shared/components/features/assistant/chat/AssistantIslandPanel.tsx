"use client";

import { ChevronUp, Pause, Volume2, X } from "lucide-react";
import { useId, type KeyboardEvent } from "react";

import { useSpeech } from "@/core/hooks/use-speech";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { AssistantMark } from "./AssistantMark";
import type { AssistantIslandAction, AssistantIslandItem } from "../types";

interface AssistantIslandPanelProps {
  item: AssistantIslandItem;
  /** Nombre del asistente, para la firma. */
  name: string;
  /** Plegar: el ítem queda en el punto de la píldora. */
  onFold: () => void;
  /** Descartar un aviso (la ✕). Sin esto, la ✕ pliega. */
  onDismiss?: (id: string) => void;
}

/**
 * Lo que la isla despliega: la pregunta (P), un aviso (A) o un resumen (R).
 * Vive dentro de la tinta de `AssistantDock`, así que usa los tokens de
 * siempre y botones `contrast` + `glass` (DESIGN-SYSTEM §9.5.1).
 *
 * La pregunta es un `group` con nombre; aviso y resumen son regiones vivas
 * corteses. `Escape` con el foco dentro pliega, y la isla nunca roba el foco.
 */
export function AssistantIslandPanel({ item, name, onFold, onDismiss }: AssistantIslandPanelProps) {
  const titleId = useId();
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    onFold();
  };

  if (item.kind === "notice") {
    return (
      <div className="assistant-island__notice" role="status" aria-live="polite" onKeyDown={onKeyDown}>
        <div className="min-w-0 flex-1">
          <p className="assistant-island__notice-title">{item.title}</p>
          {item.body === undefined ? null : <p className="assistant-island__muted text-[12.5px] leading-snug">{item.body}</p>}
        </div>
        {item.action === undefined ? null : <IslandButton action={item.action} strong />}
        <button
          type="button"
          className="assistant-island__icon"
          aria-label={onDismiss === undefined ? "Plegar" : "Descartar"}
          onClick={() => {
            if (onDismiss === undefined) onFold();
            else onDismiss(item.id);
          }}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="assistant-island__panel"
      role={item.kind === "question" ? "group" : "region"}
      aria-labelledby={titleId}
      aria-live={item.kind === "summary" ? "polite" : undefined}
      onKeyDown={onKeyDown}
    >
      <div className="flex min-h-[22px] items-center gap-1.5">
        <AssistantMark name={name} size="sm" className="assistant-island__mark" />
        <span className="assistant-island__muted text-[12px]">{item.eyebrow}</span>
        <span className="flex-1" />
        {item.speech === undefined ? null : <SpeakButton id={item.id} text={item.speech} />}
        <button type="button" className="assistant-island__icon" aria-label="Plegar" onClick={onFold}>
          <ChevronUp className="size-4" aria-hidden="true" />
        </button>
      </div>
      <p id={titleId} className="assistant-island__title">
        {item.title}
      </p>
      {item.kind === "question" && item.datum !== undefined ? (
        <div className="assistant-island__datum">
          <span className="assistant-island__muted text-[11.5px]">{item.datum.label}</span>
          <span className="text-[14px] leading-snug">{item.datum.value}</span>
          <span className="assistant-island__muted mt-0.5 text-[11.5px]">{item.datum.origin}</span>
        </div>
      ) : null}
      {item.kind === "summary" && item.highlights !== undefined && item.highlights.length > 0 ? (
        <ul className="assistant-island__highlights">
          {item.highlights.slice(0, 3).map((line) => (
            <li key={line.label} data-tone={line.tone}>
              {line.label} <b>{line.detail}</b>
            </li>
          ))}
        </ul>
      ) : null}
      {item.actions.length === 0 ? null : (
        <div className="flex flex-wrap gap-1.5">
          {item.actions.map((action, index) => (
            <IslandButton key={action.id} action={action} strong={index === 0} />
          ))}
        </div>
      )}
    </div>
  );
}

function IslandButton({ action, strong }: { action: AssistantIslandAction; strong: boolean }) {
  const Icon = action.icon;
  return (
    <Button
      type="button"
      size="sm"
      variant={strong ? "contrast" : "glass"}
      className={cn("rounded-full", !strong && "px-3")}
      onClick={action.onSelect}
    >
      {Icon === undefined ? null : <Icon aria-hidden="true" />}
      {action.label}
    </Button>
  );
}

function SpeakButton({ id, text }: { id: string; text: string }) {
  const speech = useSpeech(id);
  if (!speech.supported) return null;
  return (
    <button
      type="button"
      className="assistant-island__icon"
      aria-pressed={speech.speaking}
      aria-label={speech.speaking ? "Pausar la lectura" : "Escuchar"}
      onClick={() => {
        speech.toggle(text);
      }}
    >
      {speech.speaking ? <Pause className="size-4" aria-hidden="true" /> : <Volume2 className="size-4" aria-hidden="true" />}
    </button>
  );
}
