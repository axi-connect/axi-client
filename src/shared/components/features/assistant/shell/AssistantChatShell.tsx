"use client";

import { useRef, type ReactNode } from "react";

import { useAutoScroll } from "@/core/hooks/use-auto-scroll";
import { cn } from "@/core/lib/utils";
import { useDockedHero } from "../hooks/use-docked-hero";
import { useComposerFlip } from "./use-composer-flip";

interface AssistantChatShellProps {
  /** Sin conversación: el conjunto (dock, saludo, compositor, píldoras) se centra. */
  empty: boolean;
  /**
   * La barra del asistente (`AssistantDock`). Sin ella no hay reserva ni
   * centinela: es el caso del asistente bloqueado, que pinta una cara estática
   * en `children`.
   */
  dock?: ReactNode;
  /** Acciones de la esquina superior derecha del campo (fuera de la barra). */
  actions?: ReactNode;
  /** Lo que va entre la barra y el hilo (el informe de Axel, el saludo). */
  hero?: ReactNode;
  /** El hilo. */
  children?: ReactNode;
  /** El compositor (y lo que cuelga de él: píldoras, línea de confianza). */
  composer: ReactNode;
  /** Qué cambios deben pegar el scroll al fondo (si la persona ya estaba abajo). */
  autoScrollDeps: readonly unknown[];
  className?: string;
}

/**
 * El chat entero: la barra, el hilo y el compositor sobre **un solo campo**
 * (`.assistant-field`, que pone el `<main>` de cada vista). Este componente es
 * el dueño del reparto vertical.
 *
 * Tres decisiones (2026-09-15, despacho de Axel) que explican la forma que tiene
 * y que ahora comparten Axel y Alba:
 *
 * - **El personaje no se pierde al bajar.** Vive en la barra sticky dentro del
 *   scroller: al pasar el centinela, `useDockedHero` marca `data-docked` y el
 *   CSS lo acopla a 40 px con un `transform`. Una sola instancia, siempre.
 * - **El compositor empieza centrado y baja al primer mensaje.** Con
 *   `data-empty` la raíz centra el conjunto; al llegar la conversación vuelve a
 *   `[scroller][compositor]`. El nodo del compositor es el mismo en los dos
 *   estados —conserva el foco y el placeholder tecleado— y el viaje es un FLIP
 *   único de `transform` (`useComposerFlip`), no una animación de layout.
 * - **Autoscroll con guarda de intención**: pegado al fondo sigue lo que llega;
 *   si la persona subió a leer, no se la arrastra. `stickOnMount: false` porque
 *   con el hilo vacío el primer scroll se llevaría el hero fuera de pantalla.
 */
export function AssistantChatShell({
  empty,
  dock,
  actions,
  hero,
  children,
  composer,
  autoScrollDeps,
  className,
}: AssistantChatShellProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const hasDock = dock !== undefined && dock !== null;

  const { containerRef, bottomRef } = useAutoScroll<HTMLDivElement>({
    deps: autoScrollDeps,
    stickOnMount: false,
    behavior: "auto",
  });

  useDockedHero(rootRef, containerRef, sentinelRef, { enabled: hasDock && !empty });
  useComposerFlip(composerRef, empty);

  return (
    <div
      ref={rootRef}
      data-empty={empty ? "" : undefined}
      className={cn("assistant-chat relative flex min-h-0 flex-1 flex-col", className)}
    >
      {actions === undefined || actions === null ? null : (
        <div className="absolute top-2.5 right-3 z-30">{actions}</div>
      )}

      <div ref={containerRef} className="sidebar-scroll assistant-scroller min-h-0 flex-1 overflow-y-auto px-6 pb-2">
        <div className="mx-auto flex w-full max-w-[640px] flex-col">
          {hasDock ? (
            <>
              {dock}
              {/* Reserva para el personaje colgando de la barra, y el centinela que decide el acople. */}
              <div className="assistant-hero-spacer" aria-hidden="true" />
              <div ref={sentinelRef} className="h-px" aria-hidden="true" />
            </>
          ) : null}
          {hero}
          {children}
          <div ref={bottomRef} className="h-2" />
        </div>
      </div>

      {/* El bloom violeta que hace que el compositor lea como la fuente de luz
          de la pantalla lo pone el núcleo del aura (`.assistant-field::after`),
          que cae justo detrás de esta franja. */}
      <div ref={composerRef} className="flex-none px-6 pt-3 pb-5">
        <div className="mx-auto w-full max-w-[640px]">{composer}</div>
      </div>
    </div>
  );
}
