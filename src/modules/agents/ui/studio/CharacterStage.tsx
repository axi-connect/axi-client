"use client";

import { memo } from "react";

import { cn } from "@/core/lib/utils";
import {
  AGENT_STATUS_LABELS,
  CHARACTER_LABELS,
  COLOR_LABELS,
  type AgentCharacter,
  type AgentColor,
  type AgentStatus,
} from "@/modules/agents/domain/agent";
import { useStudioMood } from "@/modules/agents/infrastructure/hooks/use-studio-mood";
import { KIT_CHARACTER } from "@/modules/agents/ui/studio/CharacterPicker";
import { AssistantHeroAvatar } from "@/shared/components/features/assistant";
import { Badge } from "@/shared/components/ui/badge";

const STATUS_DOT: Record<AgentStatus, string> = {
  active: "bg-success",
  paused: "bg-warning",
  draft: "bg-muted-foreground/40",
};

interface CharacterStageProps {
  character: AgentCharacter;
  color: AgentColor;
  name: string;
  status: AgentStatus;
  voiceName: string | null;
  saving: boolean;
  saveError: boolean;
  nameFocused: boolean;
  justSaved: boolean;
  previewPlaying: boolean;
  className?: string;
}

/**
 * El escenario del estudio: el ÚNICO avatar vivo de la pantalla (parpadea, mira
 * al puntero, respira al guardar), sobre el campo de marca que sigue el tema
 * (D9). `memo` con props primitivas: el formulario se re-renderiza en cada
 * tecla y la cara no se reconcilia por escribir reglas — el mismo contrato que
 * `AxelHeroAvatar`. El nombre del agente vive debajo, en Nexa: es él quien se
 * presenta al cliente (D6); el personaje y el color son la etiqueta pequeña.
 */
export const CharacterStage = memo(function CharacterStage({
  character,
  color,
  name,
  status,
  voiceName,
  saving,
  saveError,
  nameFocused,
  justSaved,
  previewPlaying,
  className,
}: CharacterStageProps) {
  const { mood, gesture, motion, greet } = useStudioMood({
    paused: status === "paused",
    saving,
    saveError,
    nameFocused,
    justSaved,
    previewPlaying,
    appearanceKey: `${character}:${color}`,
  });
  const shownName = name.trim() || "Tu agente";

  return (
    <div className={cn("assistant-field flex flex-col items-center gap-1 rounded-3xl border border-border/60 px-4 pt-5 pb-4", className)}>
      <AssistantHeroAvatar
        mood={mood}
        gesture={gesture}
        motion={motion}
        accessory="none"
        character={KIT_CHARACTER[character]}
        color={color}
        stageSize="hero"
        onGreet={greet}
        label={`${shownName}, ${CHARACTER_LABELS[character]}`}
        greetLabel={`Saludar a ${shownName}`}
      />
      <div className="mt-1.5 flex min-w-0 flex-col items-center gap-0.5 text-center">
        <span className="font-heading text-[22px] font-bold tracking-tight">{shownName}</span>
        <span className="text-[12.5px] text-muted-foreground">
          {CHARACTER_LABELS[character]} · {COLOR_LABELS[color]}
          {voiceName ? ` · voz de ${voiceName}` : ""}
        </span>
        <Badge variant="secondary" className="mt-1.5 gap-1.5 font-medium">
          <span aria-hidden className={cn("size-[7px] rounded-full", STATUS_DOT[status])} />
          {AGENT_STATUS_LABELS[status]}
        </Badge>
      </div>
    </div>
  );
});
