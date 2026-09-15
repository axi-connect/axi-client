"use client";

import { BarChart3, Flame, Megaphone } from "lucide-react";

import { cn } from "@/core/lib/utils";

/**
 * Las tres cosas que Axel hace de verdad, en el orden en que un dueño las
 * pediría: primero entender, luego a quién tocar, luego qué armar. La etiqueta
 * es corta a propósito; la frase completa que se envía va en el `aria-label`,
 * así el lector de pantalla oye exactamente lo que va a pasar.
 */
export const STARTERS = [
  { icon: BarChart3, label: "¿Cómo vamos?", prompt: "¿Cómo vamos este mes?" },
  {
    icon: Flame,
    label: "Clientes calientes",
    prompt: "¿Quiénes son mis clientes más calientes y por qué?",
  },
  {
    icon: Megaphone,
    label: "Ármame una campaña",
    prompt: "Ármame una campaña para lo que veas más urgente.",
  },
] as const;

interface StarterPillsProps {
  onPick: (prompt: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Acciones rápidas en píldoras compactas, debajo del compositor. Sustituyen a
 * las tres tarjetas grandes con pista: icono + etiqueta y nada más. Solo se
 * muestran mientras no hay conversación; el compositor sigue sugiriendo después
 * con su placeholder tecleado.
 */
export function StarterPills({ onPick, disabled = false, className }: StarterPillsProps) {
  return (
    <div className={cn("flex flex-wrap justify-center gap-2", className)}>
      {STARTERS.map((starter) => (
        <button
          key={starter.label}
          type="button"
          aria-label={starter.prompt}
          disabled={disabled}
          onClick={() => {
            onPick(starter.prompt);
          }}
          className={cn(
            "group inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3.5 py-1.5",
            "text-[12.5px] font-medium backdrop-blur transition-all",
            "hover:-translate-y-px hover:border-accent-violet/40 hover:shadow-float",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          <starter.icon
            className="size-[15px] text-muted-foreground transition-colors group-hover:text-accent-violet"
            aria-hidden="true"
          />
          {starter.label}
        </button>
      ))}
    </div>
  );
}
