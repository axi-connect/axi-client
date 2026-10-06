"use client";

import { Sparkles, X } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { AssistantMark } from "@/shared/components/features/assistant";
import { Button } from "@/shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { HSM_CATEGORY_LABELS } from "@/modules/marketing/domain/enums";
import {
  confidenceLabel,
  signalLines,
  type TemplateCategoryReview,
} from "@/modules/marketing/domain/template-category-review";
import type { JevAdvisor, JevPillState } from "./use-jev-advisor";

const PILL =
  "glass-control inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-[13px] transition-colors focus-visible:ring-[3px] focus-visible:ring-accent-violet/40 focus-visible:outline-none";

/**
 * Jev en la isla (hotfix 131049, maqueta v2): una píldora siempre a la vista,
 * por largo que sea el mensaje, y el porqué solo si se pide — un popover de
 * cristal SOBRE la isla, nunca debajo de la vista previa.
 */
export function JevIslandControl({ jev }: { jev: JevAdvisor }) {
  const { pill } = jev;

  if (pill.kind === "waiting" || pill.kind === "reading") {
    return (
      <span
        role="status"
        aria-live="polite"
        className={cn(
          PILL,
          "text-muted-foreground cursor-default",
          pill.kind === "reading" && "animate-pulse motion-reduce:animate-none",
        )}
      >
        <Sparkles
          aria-hidden
          className={cn("size-3.5", pill.kind === "reading" ? "text-accent-violet" : "opacity-60")}
        />
        {pill.kind === "reading" ? "Leyendo…" : "Jev"}
        <span className="sr-only">
          {pill.kind === "reading" ? "Jev está leyendo la plantilla" : "Jev la lee cuando hagas una pausa al escribir"}
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      <Popover open={jev.panelOpen} onOpenChange={jev.setPanelOpen}>
        <PopoverTrigger asChild>
          <button type="button" className={cn(PILL, pillTone(pill))} aria-label={pillLabel(pill)}>
            <Sparkles
              aria-hidden
              className={cn("size-3.5", pill.kind === "agrees" ? "opacity-70" : "text-accent-violet")}
            />
            <span className="font-semibold">{pillText(pill)}</span>
            <PillMeta pill={pill} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="center"
          sideOffset={14}
          collisionPadding={12}
          className="w-[min(26rem,calc(100vw-1.5rem))] rounded-3xl p-5"
        >
          <JevPanel jev={jev} review={pill.review} />
        </PopoverContent>
      </Popover>
      {pill.kind === "switched" && (
        <button
          type="button"
          onClick={jev.undoSwitch}
          className="text-foreground/80 hover:text-foreground h-9 rounded-full px-2.5 text-[13px] underline underline-offset-4"
        >
          Deshacer
        </button>
      )}
    </span>
  );
}

function PillMeta({ pill }: { pill: Exclude<JevPillState, { kind: "waiting" | "reading" }> }) {
  if (pill.kind === "agrees") return <span aria-hidden className="bg-success size-1.5 rounded-full" />;
  if (pill.kind === "switched") return null;
  const confidence = confidenceLabel(pill.review);
  return <span className="text-muted-foreground text-xs tabular-nums">{confidence ?? "reglas de Meta"}</span>;
}

function pillTone(pill: JevPillState): string {
  if (pill.kind === "differs" || pill.kind === "switched") {
    return pill.kind === "differs" && pill.review.source === "rules"
      ? "border border-dashed border-accent-violet/50"
      : "ring-1 ring-accent-violet/45 bg-accent-violet/10";
  }
  return "";
}

function pillText(pill: Exclude<JevPillState, { kind: "waiting" | "reading" }>): string {
  const label = HSM_CATEGORY_LABELS[pill.review.category];
  return pill.kind === "switched" ? `Pasé a ${label}` : label;
}

function pillLabel(pill: Exclude<JevPillState, { kind: "waiting" | "reading" }>): string {
  const label = HSM_CATEGORY_LABELS[pill.review.category].toLowerCase();
  if (pill.kind === "agrees") return `Jev: Meta la leerá como ${label}, como elegiste. Ver por qué`;
  if (pill.kind === "switched") return `Jev cambió la categoría a ${label}. Ver por qué`;
  return `Jev: Meta la leerá como ${label}. Ver por qué`;
}

/** El porqué: el veredicto, su certeza, hasta tres frases y qué hacer. */
function JevPanel({ jev, review }: { jev: JevAdvisor; review: TemplateCategoryReview }) {
  const label = HSM_CATEGORY_LABELS[review.category];
  const differs = review.category !== jev.category;
  const lines = signalLines(review.signals);
  const confidence = confidenceLabel(review);
  // «Usar …» solo si se puede: ni aprobada (bloqueada) ni autenticación (no se crea aquí).
  const canAdopt = differs && !jev.locked && review.category !== "authentication";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <AssistantMark name="Jev" size="sm" />
        <button
          type="button"
          aria-label="Cerrar"
          onClick={() => jev.setPanelOpen(false)}
          className="bg-foreground/5 hover:bg-foreground/10 grid size-7 place-items-center rounded-full transition-colors"
        >
          <X aria-hidden className="text-muted-foreground size-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        <h2 className="text-lg leading-snug font-semibold tracking-tight">
          {review.category === "authentication"
            ? "Parece de autenticación"
            : `Meta la leerá como ${label.toLowerCase()}`}
        </h2>
        {review.probabilities !== null && confidence !== null && (
          <div className="flex items-center gap-2.5">
            <div className="bg-foreground/8 h-1 flex-1 overflow-hidden rounded-full">
              <div
                className="bg-accent-violet h-full rounded-full"
                style={{
                  width: `${String(Math.round((review.confidence ?? 0) * 100))}%`,
                }}
              />
            </div>
            <span className="text-muted-foreground text-xs tabular-nums">{confidence}</span>
          </div>
        )}
        <p className="text-muted-foreground text-[13px] leading-relaxed text-pretty">{explanation(review, jev)}</p>
      </div>

      {lines.length > 0 && (
        <ul className="border-border/60 flex flex-col border-t pt-2.5">
          {lines.map((line) => (
            <li key={line.phrase} className="flex items-baseline gap-3 py-1.5" title={line.reason}>
              <span className="text-accent-violet w-12 shrink-0 text-[11px] font-semibold">{line.tag}</span>
              <span className="text-foreground/90 min-w-0 truncate text-[13px]">«{line.phrase}»</span>
            </li>
          ))}
        </ul>
      )}

      {(review.category === "marketing" || canAdopt) && (
        <div className="flex gap-2">
          {review.category === "marketing" && (
            <Button
              type="button"
              variant="contrast"
              className="h-10 flex-1 rounded-full"
              onClick={() => void jev.requestRewrite()}
            >
              Versión de utilidad
            </Button>
          )}
          {canAdopt && (
            <Button type="button" variant="glass" className="h-10" onClick={jev.adoptReviewedCategory}>
              Usar {label.toLowerCase()}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function explanation(review: TemplateCategoryReview, jev: JevAdvisor): string {
  const source = review.source === "rules" ? " Esta vez hablaron las reglas de Meta, sin Jev." : "";
  if (review.category === "authentication") {
    return `Entrega un código de acceso. Desde aquí no se crean plantillas de autenticación.${source}`;
  }
  if (jev.pill.kind === "switched") return `No habías elegido categoría: la ajusté por lo que dice el texto.${source}`;
  if (review.category === jev.category) return `Coincide con lo que elegiste.${source}`;
  if (jev.locked)
    return `Está aprobada en otra categoría y Meta no deja cambiarla: para otra, crea una nueva.${source}`;
  return review.category === "marketing"
    ? `Elegiste utilidad. Como marketing, puede no llegar a quien nunca te ha escrito.${source}`
    : `Elegiste marketing, pero el texto informa sin vender: como utilidad cuesta menos.${source}`;
}
