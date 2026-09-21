"use client";

import { useRef } from "react";

import { cn } from "@/core/lib/utils";
import { AGENT_CHARACTERS, CHARACTER_LABELS, CHARACTER_TAGLINES, type AgentCharacter, type AgentColor } from "@/modules/agents/domain/agent";
import { AssistantAvatar, type AssistantCharacter } from "@/shared/components/features/assistant";

/** El código del catálogo del servidor y el del rig del kit coinciden letra a letra; esto lo fija en tipos. */
export const KIT_CHARACTER = {
  cloudee: "cloudee",
  nova: "nova",
  strobi: "strobi",
} as const satisfies Record<AgentCharacter, AssistantCharacter>;

/**
 * Los tres personajes de plataforma como `radiogroup` (roving tabindex, ←/→,
 * Home/End). Cada tile es un `AssistantAvatar` ESTÁTICO del personaje con el
 * color elegido: la vida (parpadeo, mirada) es solo del escenario, un avatar
 * vivo por pantalla.
 */
export function CharacterPicker({
  value,
  color,
  onChange,
  disabled = false,
  size = "default",
  className,
}: {
  value: AgentCharacter;
  color: AgentColor;
  onChange: (character: AgentCharacter) => void;
  disabled?: boolean;
  /** `compact` para el onboarding (tiles más bajos, sin tagline). */
  size?: "default" | "compact";
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = AGENT_CHARACTERS.indexOf(value);
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    let next: number | null = null;
    if (step !== undefined) next = (index + step + AGENT_CHARACTERS.length) % AGENT_CHARACTERS.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = AGENT_CHARACTERS.length - 1;
    if (next === null) return;
    event.preventDefault();
    const character = AGENT_CHARACTERS[next];
    if (character === undefined) return;
    onChange(character);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label="Personaje" className={cn("grid grid-cols-3 gap-2", className)} onKeyDown={onKeyDown}>
      {AGENT_CHARACTERS.map((character, index) => {
        const checked = character === value;
        return (
          <button
            key={character}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={`${CHARACTER_LABELS[character]}, ${CHARACTER_TAGLINES[character].toLowerCase()}`}
            tabIndex={checked ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(character)}
            className={cn(
              "flex flex-col items-center rounded-2xl border border-border bg-background px-1.5 py-2 transition-[border-color,box-shadow,transform] duration-150",
              "hover:border-foreground/25 active:scale-[.98] focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
              checked && "border-brand shadow-[0_0_0_3px_color-mix(in_srgb,var(--axi-brand)_18%,transparent)]",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <AssistantAvatar
              expression="neutral"
              character={KIT_CHARACTER[character]}
              color={color}
              transitionMs={0}
              className={size === "compact" ? "size-11" : "size-[58px]"}
            />
            <span className="text-[12.5px] font-semibold">{CHARACTER_LABELS[character]}</span>
            {size === "default" ? <span className="text-[11px] text-muted-foreground">{CHARACTER_TAGLINES[character]}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
