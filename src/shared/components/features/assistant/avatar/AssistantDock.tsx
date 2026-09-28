"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/core/lib/utils";
import { islandClassName } from "@/shared/components/features/island";

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
  className?: string;
}

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
 * Aquí vive **la única instancia viva del avatar**. Las tres formas son capas
 * que se funden por `opacity`, y el avatar viaja entre ellas con un solo
 * `transform`: ni un segundo componente, ni animaciones de tamaño. El ancho de
 * la píldora depende de su texto, así que se mide una vez por cambio con un
 * `ResizeObserver` y se escribe en una variable CSS por ref, sin estado.
 */
export function AssistantDock({ title, hero, meta, status, activity, working = false, className }: AssistantDockProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);

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
  }, []);

  return (
    <header className={cn("assistant-dock", className)} data-working={working ? "" : undefined}>
      <div ref={barRef} className="assistant-dock__bar">
        <div className={cn(INK, "assistant-island assistant-island--l")} aria-hidden="true" />
        <div ref={pillRef} className={cn(INK, "assistant-island assistant-island--s")}>
          <span className="assistant-dock__title font-heading" aria-hidden="true">
            {title}
          </span>
          {meta === null || meta === undefined ? null : (
            <span className="assistant-dock__meta" aria-hidden="true">
              {meta}
            </span>
          )}
          {status === null || status === undefined ? null : <span className="assistant-dock__status">{status}</span>}
        </div>
        <div className={cn(INK, "assistant-island assistant-island--m")}>
          {working && activity !== undefined && activity !== null ? activity : null}
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
