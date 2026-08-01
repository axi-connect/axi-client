"use client";

import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import type { ContextPanelDef } from "./registry";

/**
 * Columna de 48px con un icono por panel de contexto. Solo iconos: a este ancho
 * no cabe texto, así que la etiqueta vive en el tooltip (a la IZQUIERDA, que es
 * donde hay sitio) y en el título del panel abierto.
 *
 * No usa `SidebarProvider`: cada instancia monta su propio listener de ⌘B y ya
 * hay tres providers anidados en esta ruta.
 */
export function ContextRail({
  panels,
  activeId,
  onToggle,
  className,
}: {
  panels: ContextPanelDef[];
  activeId: string | null;
  onToggle: (id: string) => void;
  className?: string;
}) {
  if (panels.length === 0) return null;

  return (
    <aside
      aria-label="Contexto de la conversación"
      className={cn(
        "w-12 shrink-0 flex-col items-center gap-1 border-l border-border bg-background/60 py-2",
        className,
      )}
    >
      {panels.map((panel) => {
        const Icon = panel.icon;
        const active = activeId === panel.id;
        return (
          <Tooltip key={panel.id}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={panel.label}
                aria-pressed={active}
                className={cn("size-9", active && "bg-accent text-foreground")}
                onClick={() => onToggle(panel.id)}
              >
                <Icon className="size-4" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">{panel.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </aside>
  );
}
