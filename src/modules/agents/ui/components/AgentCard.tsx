"use client";

import { EllipsisVertical, Mic, MicOff, Plug, Trash2 } from "lucide-react";
import Link from "next/link";

import { cn } from "@/core/lib/utils";
import { ChannelKindIcon, type ChannelDTO } from "@/modules/channels/public";
import {
  AGENT_STATUS_LABELS,
  agentHasVoice,
  BRIEF_ROLE_LABELS,
  CHARACTER_LABELS,
  type AgentStatus,
  type AiAgentListItemDTO,
} from "@/modules/agents/domain/agent";
import { KIT_CHARACTER } from "@/modules/agents/ui/studio/CharacterPicker";
import { AssistantAvatar, AssistantStage, type AssistantExpressionName } from "@/shared/components/features/assistant";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

/** La cara que pone el personaje en la rejilla según el estado (estática). */
const STATUS_FACE: Record<AgentStatus, AssistantExpressionName> = {
  active: "neutral",
  paused: "asleep",
  draft: "curious",
};

const STATUS_DOT: Record<AgentStatus, string> = {
  active: "bg-success",
  paused: "bg-warning",
  draft: "bg-muted-foreground/40",
};

/**
 * Un agente en la rejilla de `/admin/agents`: personaje + nombre + rol + estado
 * + canales que lo usan + voz. Toda la tarjeta navega al estudio; el menú ⋮
 * solo elimina. El avatar es ESTÁTICO (`transitionMs={0}`, sin hooks de vida):
 * el único avatar vivo de la pantalla es el del escenario del estudio.
 */
export function AgentCard({
  agent,
  channels,
  onDelete,
  className,
}: {
  agent: AiAgentListItemDTO;
  /** Canales del tenant; se pintan los que tienen a este agente como predeterminado. */
  channels: ChannelDTO[];
  onDelete: (agent: AiAgentListItemDTO) => void;
  className?: string;
}) {
  const used = channels.filter((channel) => channel.default_ai_agent_id === agent.id);
  const role = agent.brief?.role;
  const hasVoice = agentHasVoice(agent);

  return (
    <div
      className={cn(
        "relative grid grid-cols-[104px_minmax(0,1fr)] items-center gap-3.5 rounded-[20px] border border-border bg-background py-3.5 pr-4 pl-3",
        "transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-[var(--shadow-float)] focus-within:border-foreground/20",
        className,
      )}
    >
      <Link
        href={`/admin/agents/${agent.id}`}
        className="absolute inset-0 rounded-[20px] focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
        aria-label={`${agent.name}, ${role ? BRIEF_ROLE_LABELS[role].long.toLowerCase() : "sin rol"}, ${AGENT_STATUS_LABELS[agent.status].toLowerCase()}`}
      />
      <AssistantStage className="[--stage-h:108px] [--stage-w:104px]">
        <AssistantAvatar
          expression={STATUS_FACE[agent.status]}
          character={KIT_CHARACTER[agent.appearance.character]}
          color={agent.appearance.color}
          transitionMs={0}
        />
      </AssistantStage>

      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex min-w-0 items-center gap-2 pr-8">
          <span className="truncate text-base font-semibold tracking-tight">{agent.name}</span>
          <Badge variant="secondary" className="gap-1.5 whitespace-nowrap font-medium">
            <span aria-hidden className={cn("size-[7px] rounded-full", STATUS_DOT[agent.status])} />
            {AGENT_STATUS_LABELS[agent.status]}
          </Badge>
        </div>
        <span className="text-[12.5px] text-muted-foreground">
          {role ? BRIEF_ROLE_LABELS[role].long : "Sin rol definido"} · {CHARACTER_LABELS[agent.appearance.character]}
        </span>
        <div className="mt-0.5 flex flex-wrap gap-1.5">
          {used.length > 0 ? (
            used.map((channel) => (
              <span key={channel.id} className="inline-flex h-[26px] items-center gap-1.5 rounded-full border border-border px-2.5 text-[12.5px]">
                <ChannelKindIcon kind={channel.kind} className="size-3.5" />
                <span className="max-w-[16ch] truncate">{channel.name}</span>
              </span>
            ))
          ) : (
            <span className="inline-flex h-[26px] items-center gap-1.5 rounded-full border border-dashed border-border px-2.5 text-[12.5px] text-muted-foreground">
              <Plug className="size-3.5" aria-hidden />
              Sin canal asignado
            </span>
          )}
          <span className={cn("inline-flex h-[26px] items-center gap-1.5 rounded-full border border-border px-2.5 text-[12.5px]", !hasVoice && "text-muted-foreground")}>
            {hasVoice ? <Mic className="size-3.5" aria-hidden /> : <MicOff className="size-3.5" aria-hidden />}
            {hasVoice ? "Con voz" : "Sin voz"}
          </span>
        </div>
      </div>

      <div className="absolute top-2.5 right-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={`Más acciones de ${agent.name}`}>
              <EllipsisVertical className="size-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(agent)}>
              <Trash2 className="size-4" aria-hidden />
              Eliminar agente
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
