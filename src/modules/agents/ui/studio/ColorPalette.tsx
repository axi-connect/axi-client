"use client";

import { useRef } from "react";

import { cn } from "@/core/lib/utils";
import { AGENT_COLORS, COLOR_LABELS, type AgentColor } from "@/modules/agents/domain/agent";

/**
 * Los ocho tonos de la paleta curada (D8) como `radiogroup`. Cada swatch toma
 * su color del MISMO material que pinta al personaje: es un `.assistant-avatar`
 * con `data-color`, así que `--av-body-mid` resuelve por tema (claro/oscuro) y
 * si un tono cambia en `globals.css`, cambia aquí también. Se guarda el código,
 * nunca un hex; el nombre accesible es la palabra, no el color.
 */
export function ColorPalette({
  value,
  onChange,
  disabled = false,
  className,
}: {
  value: AgentColor;
  onChange: (color: AgentColor) => void;
  disabled?: boolean;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = AGENT_COLORS.indexOf(value);
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    let next: number | null = null;
    if (step !== undefined) next = (index + step + AGENT_COLORS.length) % AGENT_COLORS.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = AGENT_COLORS.length - 1;
    if (next === null) return;
    event.preventDefault();
    const color = AGENT_COLORS[next];
    if (color === undefined) return;
    onChange(color);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label="Color del personaje" className={cn("flex flex-wrap gap-2", className)} onKeyDown={onKeyDown}>
      {AGENT_COLORS.map((color, index) => {
        const checked = color === value;
        return (
          <button
            key={color}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={COLOR_LABELS[color]}
            title={COLOR_LABELS[color]}
            tabIndex={checked ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(color)}
            // El swatch es un `.assistant-avatar` sin geometría: solo hereda el material por data-color
            className={cn(
              "assistant-avatar relative size-[30px] rounded-full transition-transform duration-150 hover:scale-[1.08]",
              "shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--foreground)_16%,transparent)]",
              "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-3",
              checked && "outline-2 outline-brand outline-offset-3",
              disabled && "cursor-not-allowed opacity-60",
            )}
            data-color={color}
            style={{ background: "var(--av-body-mid)" }}
          >
            {checked ? <span aria-hidden className="absolute inset-[9px] rounded-full opacity-75" style={{ background: "var(--av-ink)" }} /> : null}
          </button>
        );
      })}
    </div>
  );
}
