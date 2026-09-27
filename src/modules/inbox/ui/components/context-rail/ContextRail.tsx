"use client";

import { cn } from "@/core/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import type { ConversationDTO } from "@/modules/inbox/domain/inbox";
import type { ContextPanelDef } from "./registry";

/** Id del botón de un panel: el chrome le devuelve el foco al cerrarse. */
export function contextRailButtonId(panelId: string): string {
  return `context-rail-${panelId}`;
}

/**
 * Columna de 48 px con un icono por panel de contexto (F4). Solo iconos: a este
 * ancho no cabe texto, así que la etiqueta vive en el tooltip (a la IZQUIERDA,
 * donde hay sitio) y en la cabecera del panel abierto. El activo es la píldora
 * en tinta del DS (antes `bg-accent`, coral: el coral es de las acciones).
 *
 * `relative z-50`: por debajo de 1600 px el panel flota con un velo `z-40`
 * sobre toda la vista; el riel queda encima para poder cambiar de panel sin
 * cerrar el que está abierto.
 *
 * No usa `SidebarProvider`: cada instancia monta su propio listener de ⌘B y ya
 * hay tres providers anidados en esta ruta.
 */
export function ContextRail({
  panels,
  activeId,
  onToggle,
  conversation,
  className,
}: {
  panels: ContextPanelDef[];
  activeId: string | null;
  onToggle: (id: string) => void;
  conversation: ConversationDTO;
  className?: string;
}) {
  if (panels.length === 0) return null;

  return (
    <aside
      aria-label="Contexto de la conversación"
      className={cn(
        "relative z-50 w-12 shrink-0 flex-col items-center gap-1.5 border-l border-border bg-background py-3",
        className,
      )}
    >
      {panels.map((panel) => {
        const Icon = panel.icon;
        const active = activeId === panel.id;
        return (
          <Tooltip key={panel.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                id={contextRailButtonId(panel.id)}
                aria-label={panel.label}
                aria-pressed={active}
                onClick={() => onToggle(panel.id)}
                className={cn(
                  "relative grid size-9 place-items-center rounded-xl transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  active ? "bg-foreground text-background" : "text-foreground/70 hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {panel.useCount !== undefined && <RailCount useCount={panel.useCount} conversation={conversation} />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">{panel.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </aside>
  );
}

/** El conteo sale de lo que ya está en memoria; se esconde en 0 y se acota en 99+. */
function RailCount({
  useCount,
  conversation,
}: {
  useCount: NonNullable<ContextPanelDef["useCount"]>;
  conversation: ConversationDTO;
}) {
  const count = useCount({ conversation });
  if (count === null || count === 0) return null;
  return (
    <span
      aria-hidden
      className="absolute -top-1 -right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-muted px-1 text-[10px] font-semibold text-foreground tabular-nums ring-2 ring-background"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
