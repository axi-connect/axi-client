"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { spring } from "@/core/styles/motion";
import type { ConversationDTO } from "@/modules/inbox/domain/inbox";
import { contextRailButtonId } from "./ContextRail";
import type { ContextPanelDef } from "./registry";

/**
 * Chrome del panel de contexto (F4): cabecera con kicker, título en Nexa y una
 * línea de contexto, cierre de 36 px; el cuerpo lo pone el panel del registry.
 *
 * Dónde abre (D6 del lienzo F4, opción a):
 * - `≥ 1600 px` → cuarta columna en línea: el chat se estrecha. Con la bandeja
 *   desplegada (navegación 256 + bandeja 232 + lista 320 + panel 340 + riel 48)
 *   el chat queda en ~400 px; a 1536 quedaría en 340, por eso el umbral no es 2xl.
 * - `md – 1599 px` → FLOTA sobre el chat, a la izquierda del riel (que sigue
 *   usable encima del velo). Nada se mueve; se cierra con Escape, tocando el
 *   velo o con la X, y el foco vuelve a su botón del riel.
 * - `< md` → pantalla completa, con las pestañas de los paneles arriba (el riel
 *   no existe a ese ancho; se entra desde la cabecera del chat).
 *
 * Profundidad: velo y panel en `z-40`, el riel en `z-50`; los menús, selects,
 * popovers y tooltips del panel van por portal en `z-50`/`z-[70]` y quedan
 * por encima. Los paneles del inbox son SÓLIDOS, nunca glass (DESIGN-SYSTEM §5.2).
 */
export function ContextPanel({
  panel,
  panels,
  conversation,
  contactId,
  contextVersion,
  onClose,
  onSelect,
}: {
  panel: ContextPanelDef;
  /** Todos los paneles visibles: en el celular son las pestañas de arriba. */
  panels: ContextPanelDef[];
  conversation: ConversationDTO;
  contactId: string;
  contextVersion: number;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const { Panel } = panel;
  const heading = panel.useHeading({ conversation, contactId, contextVersion });
  const asideRef = useRef<HTMLElement>(null);
  const headingId = `context-panel-${panel.id}-title`;

  // Al abrir, el foco entra al panel (a su cabecera) para que Escape y el
  // lector de pantalla estén donde el operador está mirando.
  useEffect(() => {
    asideRef.current?.focus({ preventScroll: true });
  }, []);

  const close = () => {
    onClose();
    // El foco vuelve al icono del riel que lo abrió (en el celular no hay riel).
    requestAnimationFrame(() => document.getElementById(contextRailButtonId(panel.id))?.focus());
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end md:right-12 min-[100rem]:static min-[100rem]:z-auto min-[100rem]:min-h-0">
      {/* Velo solo cuando el panel flota; en ≥ 1600 px convive con el chat */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Cerrar el panel de contexto"
        className="absolute inset-0 bg-black/30 min-[100rem]:hidden"
        onClick={close}
      />
      <motion.aside
        ref={asideRef}
        tabIndex={-1}
        aria-labelledby={headingId}
        onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
          // Un menú o select del panel va por portal, pero su Escape BURBUJEA por
          // React hasta aquí: solo cierra el panel si nació dentro de su DOM.
          if (event.key === "Escape" && !event.defaultPrevented && asideRef.current?.contains(event.target as Node)) {
            event.stopPropagation();
            close();
          }
        }}
        initial={prefersReducedMotion === true ? false : { x: 24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={prefersReducedMotion === true ? { duration: 0 } : spring.soft}
        className={cn(
          "relative flex h-full w-full min-w-0 flex-col overflow-hidden bg-background outline-none",
          "md:w-[340px] md:border-l md:border-border md:shadow-[-30px_0_60px_-30px_rgb(16_16_24/0.35)]",
          "min-[100rem]:h-auto min-[100rem]:min-h-0 min-[100rem]:shrink-0 min-[100rem]:shadow-none",
        )}
      >
        <header className="flex shrink-0 items-start gap-2 border-b border-border pt-4 pr-3 pb-3.5 pl-[18px]">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">{panel.label}</p>
            <h2 id={headingId} className="truncate font-heading text-xl leading-tight font-bold tracking-tight" title={heading.title}>
              {heading.title}
            </h2>
            {heading.subtitle && <p className="line-clamp-2 text-xs text-muted-foreground">{heading.subtitle}</p>}
          </div>
          <button
            type="button"
            aria-label="Cerrar el panel"
            onClick={close}
            className="grid size-9 shrink-0 place-items-center rounded-full text-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X className="size-[18px]" aria-hidden />
          </button>
        </header>

        {/* Celular: el riel no existe; las pestañas de los paneles viven aquí. */}
        {panels.length > 1 && (
          <nav aria-label="Paneles de contexto" className="sidebar-scroll flex shrink-0 gap-1.5 overflow-x-auto border-b border-border px-3.5 py-2.5 md:hidden">
            {panels.map((item) => {
              const active = item.id === panel.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap",
                    active ? "border-transparent bg-foreground text-background" : "border-border text-muted-foreground",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        )}

        <Panel conversation={conversation} contactId={contactId} contextVersion={contextVersion} />
      </motion.aside>
    </div>
  );
}
