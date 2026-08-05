"use client";

import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { spring } from "@/core/styles/motion";
import { Button } from "@/shared/components/ui/button";
import type { ConversationDTO } from "@/modules/inbox/domain/inbox";
import type { ContextPanelDef } from "./registry";

/**
 * Chrome del panel de contexto: cabecera con título y cierre, cuerpo delegado
 * al panel activo del registry.
 *
 * Comportamiento responsive (patrón `OrderDetailRail`):
 * - `xl+`  → cuarta columna inline: el chat se estrecha.
 * - `<xl`  → overlay con scrim sobre el chat; a 1024px no caben cuatro columnas
 *            (canales 256 + lista 288 + rail 48 + panel 340 dejarían ~90px de chat).
 * - `<md`  → pantalla completa: el rail no existe a ese ancho y el acceso llega
 *            desde la cabecera del chat.
 *
 * Los paneles del inbox son SÓLIDOS, nunca glass (DESIGN-SYSTEM §5.2).
 */
export function ContextPanel({
  panel,
  conversation,
  contactId,
  contextVersion,
  onClose,
}: {
  panel: ContextPanelDef;
  conversation: ConversationDTO;
  contactId: string;
  contextVersion: number;
  onClose: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const { Panel } = panel;

  return (
    <div className="fixed inset-0 z-40 flex justify-end xl:static xl:z-auto xl:min-h-0">
      {/* Scrim solo cuando el panel flota; en xl+ convive con el chat */}
      <button
        type="button"
        aria-label="Cerrar panel de contexto"
        className="absolute inset-0 bg-black/40 xl:hidden"
        onClick={onClose}
      />
      <motion.aside
        aria-label={panel.label}
        initial={prefersReducedMotion === true ? false : { x: 24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={prefersReducedMotion === true ? { duration: 0 } : spring.soft}
        className="relative flex h-full w-full flex-col overflow-hidden border-l border-border bg-background md:w-[340px] xl:h-auto xl:min-h-0 xl:shrink-0"
      >
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="truncate text-sm font-semibold">{panel.label}</h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Cerrar panel"
            className="size-8 shrink-0"
            onClick={onClose}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </header>

        <Panel
          conversation={conversation}
          contactId={contactId}
          contextVersion={contextVersion}
        />
      </motion.aside>
    </div>
  );
}
