"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { useAutoScroll } from "@/core/hooks/use-auto-scroll";
import { cn } from "@/core/lib/utils";
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
 * - **El personaje no se pierde al bajar.** Vive en la isla sticky dentro del
 *   scroller (`AssistantDock`): escenario grande con `data-empty`, píldora en
 *   cuanto hay conversación. Una sola instancia, siempre.
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
  const composerRef = useRef<HTMLDivElement>(null);
  const hasDock = dock !== undefined && dock !== null;

  const contentRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  /* En una pantalla estrecha la isla no puede centrarse: taparía las acciones
     de la esquina. Se mide su ancho una vez por cambio y el CSS le deja ese
     sitio (`--actions-w`, ver `.assistant-chat` en globals.css). */
  useEffect(() => {
    const root = rootRef.current;
    const actionsEl = actionsRef.current;
    if (root === null) return;
    if (actionsEl === null) {
      root.style.removeProperty("--actions-w");
      return;
    }
    const write = () => {
      root.style.setProperty("--actions-w", `${String(actionsEl.offsetWidth)}px`);
    };
    write();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(write);
    observer.observe(actionsEl);
    return () => {
      observer.disconnect();
    };
  }, [actions]);
  const { containerRef, bottomRef, isNearBottom, scrollToBottom } = useAutoScroll<HTMLDivElement>({
    deps: autoScrollDeps,
    stickOnMount: false,
    behavior: "auto",
  });

  /* El texto que llega en vivo hace crecer el hilo sin cambiar ninguna
     dependencia: lo sigue un `ResizeObserver` sobre el contenido (un aviso por
     cuadro como mucho), con la misma guarda de intención. Antes el largo del
     borrador iba en `autoScrollDeps` y el efecto corría con cada fragmento. */
  const nearRef = useRef(isNearBottom);
  useEffect(() => {
    nearRef.current = isNearBottom;
  }, [isNearBottom]);
  useEffect(() => {
    const content = contentRef.current;
    if (content === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (nearRef.current) scrollToBottom("auto");
    });
    observer.observe(content);
    return () => {
      observer.disconnect();
    };
  }, [scrollToBottom]);

  useComposerFlip(composerRef, empty);

  return (
    <div
      ref={rootRef}
      data-empty={empty ? "" : undefined}
      className={cn("assistant-chat relative flex min-h-0 flex-1 flex-col", className)}
    >
      {actions === undefined || actions === null ? null : (
        <div ref={actionsRef} className="assistant-chat__actions absolute top-2.5 right-3 z-30">
          {actions}
        </div>
      )}

      <div ref={containerRef} className="sidebar-scroll assistant-scroller min-h-0 flex-1 overflow-y-auto px-6 pb-2">
        <div ref={contentRef} className="mx-auto flex w-full max-w-[640px] flex-col">
          {hasDock ? (
            <>
              {dock}
              {/* Reserva para la isla: el escenario L en el vacío, la holgura bajo la píldora después. */}
              <div className="assistant-hero-spacer" aria-hidden="true" />
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
