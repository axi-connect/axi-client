"use client";

import { useId } from "react";
import { Check, ChevronDown, PencilLine } from "lucide-react";

import { cn } from "@/core/lib/utils";

import { StepMark, type StepMarkPendingStyle, type StepMarkSize, type StepMarkState } from "./StepMark";

export type FormStepState = "pending" | "done" | "error" | "blocked";

/**
 * Las cuatro caras que tenían las copias (F2 las junta sin cambiar un píxel):
 *
 * - `card`: tarjeta propia con chevrón; el subtítulo abierto o el resumen plegado
 *   en una línea truncada (alta de producto del catálogo).
 * - `divided`: sin tarjeta, separado por una línea, con el resumen a la derecha
 *   de la cabecera: dentro de un diálogo, cuatro tarjetas serían cajas dentro de
 *   una caja (plantilla de WhatsApp).
 * - `edit`: tarjeta que se eleva al abrirse; cerrada dice «Editar» y abierta
 *   «Listo» (icono en el celular) y un paso pendiente lleva el anillo de marca
 *   (Preparar entrega).
 * - `chevron`: tarjeta que se eleva al abrirse, con un chevrón que gira, el
 *   número más chico y el título más grande (editor del piloto).
 */
export type FormStepVariant = "card" | "divided" | "edit" | "chevron";

interface Look {
  /** La `<section>` se nombra con el título (región). */
  labelled: boolean;
  section: string;
  /** Al abrirse, la tarjeta se eleva (borde más marcado y sombra). */
  raised: boolean;
  button: string;
  mark: {
    size: StepMarkSize;
    pendingStyle: StepMarkPendingStyle;
    showCheck: boolean;
    className?: string;
    checkStrokeWidth?: number;
  };
  /** Qué marca lleva un paso hecho mientras está abierto. */
  doneWhileOpen: StepMarkState;
  /** Qué marca lleva un paso pendiente. */
  pendingMark: StepMarkState;
  text: string;
  title: string;
  line: string;
  /** La línea se corta con `…` y el texto completo va en `title`. */
  truncate: boolean;
  chevron: string | null;
  panel: string;
}

const LOOK: Record<FormStepVariant, Look> = {
  card: {
    labelled: true,
    section: "min-w-0 rounded-3xl border border-border bg-card",
    raised: false,
    button:
      "flex w-full items-center gap-3.5 rounded-3xl px-5 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    mark: { size: "lg", pendingStyle: "fill", showCheck: true, className: "text-sm", checkStrokeWidth: 2 },
    doneWhileOpen: "done",
    pendingMark: "pending",
    text: "flex min-w-0 flex-1 flex-col gap-0.5",
    title: "text-[15px] font-semibold",
    line: "truncate text-xs text-muted-foreground",
    truncate: true,
    chevron: "size-4.5 shrink-0 text-muted-foreground transition-transform duration-200",
    panel: "space-y-4 px-5 pb-5 sm:pl-[4.25rem]",
  },
  divided: {
    labelled: true,
    section: "border-t border-border",
    raised: false,
    button:
      "flex min-h-12 w-full items-center gap-3 rounded-xl py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    mark: { size: "sm", pendingStyle: "fill", showCheck: false },
    doneWhileOpen: "done",
    pendingMark: "pending",
    text: "",
    title: "text-[15px] font-semibold whitespace-nowrap",
    line: "text-muted-foreground ml-auto min-w-0 truncate text-right text-xs",
    truncate: true,
    chevron: "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
    panel: "space-y-4 pb-5 sm:pl-9",
  },
  edit: {
    labelled: false,
    section: "rounded-3xl border bg-card transition-shadow",
    raised: true,
    button:
      "flex w-full items-center gap-3 rounded-3xl px-4 py-4 sm:gap-4 sm:px-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    mark: { size: "lg", pendingStyle: "fill", showCheck: true },
    doneWhileOpen: "current",
    pendingMark: "current",
    text: "min-w-0 flex-1",
    title: "block text-sm font-semibold",
    line: "mt-0.5 block text-[13px] text-pretty text-muted-foreground sm:text-sm",
    truncate: false,
    chevron: null,
    panel: "space-y-5 px-5 pb-5 sm:pl-[4.25rem] lg:pl-5 [&_input]:min-w-0",
  },
  chevron: {
    labelled: false,
    section: "rounded-3xl border bg-card transition-shadow overflow-hidden",
    raised: true,
    button:
      "focus-visible:outline-ring flex w-full items-center gap-3.5 rounded-3xl px-5 py-[18px] text-left focus-visible:outline-2 focus-visible:outline-offset-2",
    mark: { size: "md", pendingStyle: "outline", showCheck: true },
    doneWhileOpen: "pending",
    pendingMark: "pending",
    text: "min-w-0 flex-1",
    title: "block text-[15.5px] font-semibold",
    line: "text-muted-foreground mt-0.5 block text-[13px] text-pretty",
    truncate: false,
    chevron: "size-[18px] shrink-0 transition-transform motion-reduce:transition-none",
    panel: "flex flex-col gap-[18px] px-5 pb-5 sm:pl-[62px]",
  },
};

function markState(look: Look, state: FormStepState, open: boolean): StepMarkState {
  if (state === "done") return open ? look.doneWhileOpen : "done";
  if (state === "pending") return look.pendingMark;
  return state;
}

/**
 * Un paso plegable de un formulario largo (DESIGN-SYSTEM §9.7): la cabecera es
 * un solo `<button aria-expanded aria-controls>` con la marca (número, ✓ o «!»),
 * el título y, plegado, el resumen de lo elegido. El contenido NO se desmonta
 * al plegar (`hidden`): los campos conservan su valor y siguen validándose.
 *
 * `blocked` y `error` se dicen al lector de pantalla junto al título; en
 * `divided` el error además reemplaza el resumen a la vista.
 */
export function FormStep({
  id,
  number,
  title,
  subtitle,
  summary,
  state,
  open,
  onToggle,
  variant = "card",
  blockedHint = "por resolver",
  errorHint = "Hay algo que corregir",
  unmountWhenClosed = false,
  children,
}: {
  /** Prefijo del id del panel (`aria-controls` = `${id}-${number}`): único en la página. Sin él, `useId`. */
  id?: string;
  number: number;
  title: string;
  /** La línea bajo el título con el paso abierto (y plegado si no hay resumen). */
  subtitle?: string;
  /** Lo elegido, para cuando el paso está plegado (en `divided`, siempre a la vista). */
  summary?: React.ReactNode;
  state: FormStepState;
  open: boolean;
  onToggle: () => void;
  variant?: FormStepVariant;
  blockedHint?: string;
  errorHint?: string;
  /**
   * Desmonta el contenido al plegar en vez de ocultarlo. Solo para quien ya
   * dependía de eso (el editor del piloto): por defecto el contenido se conserva.
   */
  unmountWhenClosed?: boolean;
  children?: React.ReactNode;
}) {
  const look = LOOK[variant];
  const generatedId = useId();
  const panelId = id ? `${id}-${String(number)}` : generatedId;
  const showError = variant === "divided" && state === "error";
  const srHint = state === "blocked" ? blockedHint : state === "error" && !showError ? errorHint : null;
  const hint = srHint ? <span className="sr-only"> ({srHint})</span> : null;

  let line: React.ReactNode;
  if (variant === "divided") line = showError ? errorHint : summary;
  else line = open ? subtitle : (summary ?? subtitle);
  // `card` calla la línea vacía; `edit` y `chevron` pintan el resumen siempre que están plegados.
  const showLine = look.truncate ? Boolean(line) : !open || Boolean(subtitle);
  // El `title` repite el texto entero de una línea truncada (en `divided`, el resumen aunque haya error).
  const lineTitle = look.truncate ? (variant === "divided" ? summary : line) : undefined;

  return (
    <section
      aria-label={look.labelled ? title : undefined}
      className={cn(look.section, look.raised && (open ? "border-foreground/15 shadow-[var(--shadow-float)]" : "border-border"))}
    >
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={panelId} className={look.button}>
        <StepMark
          number={number}
          state={markState(look, state, open)}
          size={look.mark.size}
          pendingStyle={look.mark.pendingStyle}
          showCheck={look.mark.showCheck}
          className={look.mark.className}
          checkStrokeWidth={look.mark.checkStrokeWidth}
        />
        {variant === "divided" ? (
          <>
            <span className={look.title}>
              {title}
              {hint}
            </span>
            <span className={look.line} title={typeof lineTitle === "string" ? lineTitle : undefined}>
              {line}
            </span>
          </>
        ) : (
          <span className={look.text}>
            <span className={look.title}>
              {title}
              {hint}
            </span>
            {showLine ? (
              <span className={look.line} title={typeof lineTitle === "string" ? lineTitle : undefined}>
                {line}
              </span>
            ) : null}
          </span>
        )}
        {look.chevron === null ? (
          // En el celular, «Editar» es un icono: el resumen necesita ese ancho.
          <span className="flex shrink-0 items-center gap-1.5 rounded-lg py-1 text-sm font-medium sm:px-2">
            {open ? <Check aria-hidden="true" className="size-4 sm:hidden" /> : <PencilLine aria-hidden="true" className="size-4 sm:hidden" />}
            <span className="sr-only sm:not-sr-only">{open ? "Listo" : "Editar"}</span>
          </span>
        ) : (
          <ChevronDown aria-hidden="true" className={cn(look.chevron, open && "rotate-180")} />
        )}
      </button>
      {unmountWhenClosed && !open ? null : (
        <div id={panelId} hidden={!open} className={look.panel}>
          {children}
        </div>
      )}
    </section>
  );
}
