"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/core/lib/utils";
import { islandClassName } from "@/shared/components/features/island";
import { AssistantIslandListening } from "../chat/AssistantIslandListening";
import { AssistantIslandPanel } from "../chat/AssistantIslandPanel";
import type { AssistantIslandItem, AssistantIslandListeningState as Listening } from "../types";

interface AssistantDockProps {
  /** Nombre del asistente; va en la píldora. */
  title: string;
  /** La única instancia viva del avatar (un `*HeroAvatar` del slice). */
  hero: ReactNode;
  /** Texto secundario junto al nombre: la fecha en Axel. */
  meta?: ReactNode;
  /** Lo que cierra la píldora a la derecha: el tema actual de Alba. */
  status?: ReactNode;
  /**
   * Qué está haciendo el asistente mientras trabaja (los pasos del turno). Con
   * `working` la isla crece al tamaño M y lo muestra al lado del avatar.
   */
  activity?: ReactNode;
  working?: boolean;
  /**
   * Lo que la isla despliega (pregunta, aviso o resumen). Lo decide
   * `useIslandQueue`; el dock solo lo pinta. Trabajando o dictando, espera.
   */
  item?: AssistantIslandItem | null;
  /** Pliega lo desplegado (chevron, ✕ sin `onDismiss`, `Escape`). */
  onFold?: () => void;
  /** Descarta un aviso con su ✕. */
  onDismiss?: (id: string) => void;
  /** Cuántas cosas quedaron plegadas: la píldora enseña el punto y se vuelve un botón. */
  pending?: number;
  onExpand?: () => void;
  /** El micrófono graba: la isla toma la forma E. */
  listening?: Listening | null;
  className?: string;
}

export type AssistantIslandShape = "pill" | "working" | "question" | "notice" | "summary" | "listening";

/** Qué forma toma la isla. Dictar y trabajar mandan: un aviso que llega mientras tanto espera su turno. */
export function islandShape(state: {
  working: boolean;
  item: AssistantIslandItem | null;
  listening: boolean;
}): AssistantIslandShape {
  if (state.listening) return "listening";
  if (state.working) return "working";
  return state.item?.kind ?? "pill";
}

const NO_OP = () => undefined;

const INK = islandClassName({ material: "ink", glow: "none" });

/** Sin `useLayoutEffect` en el servidor: el aviso de React no aporta nada aquí. */
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * La isla del asistente: una pieza de tinta que cambia de tamaño con lo que
 * pasa, como la Dynamic Island (lienzo aprobado 2026-09-28).
 *
 * - **L** — el escenario del estado vacío (`data-empty` en la raíz del chat): el
 *   avatar a tamaño completo dentro de una isla ancha con una trama quieta.
 * - **S** — en cuanto hay conversación: una píldora centrada arriba con el
 *   avatar, el nombre y la meta.
 * - **M** — mientras trabaja (`working`): la isla crece y enseña sus pasos.
 *
 * Con la isla viva (plan island_live_plan.md) gana cuatro formas más, siempre
 * una a la vez (`data-shape`):
 *
 * - **P** — una pregunta cuya burbuja no está a la vista, con el dato y sus botones.
 * - **A** — un aviso: una línea, un botón como mucho, brillo por tono.
 * - **R** — un resumen corto (el informe de Axel).
 * - **E** — escuchando: el micrófono graba.
 *
 * Aquí vive **la única instancia viva del avatar**. Todas las formas son capas
 * que se funden por `opacity`, y el avatar viaja entre ellas con un solo
 * `transform`: ni un segundo componente, ni animaciones de tamaño. El ancho de
 * la píldora depende de su texto, así que se mide una vez por cambio con un
 * `ResizeObserver` y se escribe en una variable CSS por ref, sin estado.
 */
export function AssistantDock({
  title,
  hero,
  meta,
  status,
  activity,
  working = false,
  item = null,
  onFold = NO_OP,
  onDismiss,
  pending = 0,
  onExpand,
  listening = null,
  className,
}: AssistantDockProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLElement | null>(null);
  const shape = islandShape({ working, item, listening: listening !== null });
  const expandable = pending > 0 && onExpand !== undefined && shape === "pill";
  const badge = pending === 1 ? "1 pendiente" : `${String(pending)} pendientes`;

  useIsoLayoutEffect(() => {
    const bar = barRef.current;
    const pill = pillRef.current;
    if (bar === null || pill === null) return;
    const write = () => {
      bar.style.setProperty("--pill-w", `${String(pill.offsetWidth)}px`);
    };
    write();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(write);
    observer.observe(pill);
    return () => {
      observer.disconnect();
    };
    // La píldora cambia de elemento (div ↔ botón) al haber algo plegado: se vuelve a medir el nuevo.
  }, [expandable]);

  const pillContent = (
    <>
      <span className="assistant-dock__title font-heading" aria-hidden="true">
        {title}
      </span>
      {meta === null || meta === undefined ? null : (
        <span className="assistant-dock__meta" aria-hidden="true">
          {meta}
        </span>
      )}
      {status === null || status === undefined ? null : <span className="assistant-dock__status">{status}</span>}
      {expandable ? (
        <span className="assistant-dock__badge" aria-hidden="true">
          {badge}
        </span>
      ) : null}
    </>
  );
  const pillClass = cn(INK, "assistant-island assistant-island--s");
  const panelItem = shape === "question" || shape === "notice" || shape === "summary" ? item : null;

  return (
    <header
      className={cn("assistant-dock", className)}
      data-shape={shape}
      data-glow={panelItem?.kind === "notice" ? panelItem.glow : undefined}
      data-working={shape === "working" ? "" : undefined}
    >
      <div ref={barRef} className="assistant-dock__bar">
        <div className={cn(INK, "assistant-island assistant-island--l")} aria-hidden="true" />
        {expandable ? (
          <button
            ref={(node) => {
              pillRef.current = node;
            }}
            type="button"
            className={pillClass}
            aria-label={`${title}: ${badge}. Abrir`}
            onClick={onExpand}
          >
            {pillContent}
          </button>
        ) : (
          <div
            ref={(node) => {
              pillRef.current = node;
            }}
            className={pillClass}
          >
            {pillContent}
          </div>
        )}
        <div className={cn(INK, "assistant-island assistant-island--m")}>
          {shape === "working" && activity !== undefined && activity !== null ? activity : null}
        </div>
        <div className={cn(INK, "assistant-island assistant-island--p")}>
          {panelItem === null ? null : (
            <AssistantIslandPanel key={panelItem.id} item={panelItem} name={title} onFold={onFold} onDismiss={onDismiss} />
          )}
        </div>
        <div className={cn(INK, "assistant-island assistant-island--e")}>
          {shape === "listening" && listening !== null ? <AssistantIslandListening {...listening} /> : null}
        </div>
        <div className="assistant-dock__hero">{hero}</div>
      </div>
    </header>
  );
}

/**
 * «mié 15 sep». Se calcula DESPUÉS de montar y no en el render: servidor y
 * navegador pueden estar en husos distintos, y una fecha formateada en el HTML
 * del servidor que no coincide con la del cliente es un error de hidratación.
 */
export function useTodayLabel(): string | null {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    setLabel(
      new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", month: "short" })
        .format(new Date())
        .replace(" de ", " ")
        .replace(/\./g, ""),
    );
  }, []);
  return label;
}
