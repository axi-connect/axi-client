"use client";

import { cn } from "@/core/lib/utils";
import type { AssistantStarter } from "../types";

interface StarterPillsProps {
  starters: readonly AssistantStarter[];
  onPick: (prompt: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Acciones rápidas en píldoras compactas, debajo del compositor: icono +
 * etiqueta y nada más. La frase completa que se envía va en el `aria-label`,
 * así el lector de pantalla oye exactamente lo que va a pasar. Solo se muestran
 * mientras no hay conversación; el compositor sigue sugiriendo después con su
 * placeholder tecleado.
 */
export function StarterPills({ starters, onPick, disabled = false, className }: StarterPillsProps) {
  return (
    <div className={cn("flex flex-wrap justify-center gap-2", className)}>
      {starters.map((starter) => (
        <button
          key={starter.label}
          type="button"
          aria-label={starter.prompt}
          disabled={disabled}
          onClick={() => {
            onPick(starter.prompt);
          }}
          className={cn(
            "group inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-3.5 py-2",
            "text-[13px] font-medium backdrop-blur transition-all",
            "hover:-translate-y-px hover:border-accent-violet/40 hover:shadow-float",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          <starter.icon className="size-[15px] text-accent-violet" aria-hidden="true" />
          {starter.label}
        </button>
      ))}
    </div>
  );
}
