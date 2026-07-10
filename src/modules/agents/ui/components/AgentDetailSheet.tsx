"use client"

import Image from "next/image";
import { cn } from "@/core/lib/utils";
import { Bot } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { useCallback, useEffect, useState } from "react";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { characterStyle, type CharacterDTO } from "@/modules/agents/domain/character";
import { useAgent } from "@/modules/agents/infrastructure/stores/agent.context";
import { getAgentById } from "@/modules/agents/infrastructure/services/agent-service.adapter";
import {
  AGENT_STATUS_LABELS,
  AI_PROVIDER_LABELS,
  type AiAgentDTO,
} from "@/modules/agents/domain/agent";

/**
 * Detalle de agente en panel lateral. Se abre con el CustomEvent
 * `agents:view:open` (detail: { id }).
 */
export default function AgentDetailSheet() {
  const { characters } = useAgent();
  const [open, setOpen] = useState(false);
  const [id, setId] = useState<string | undefined>(undefined);
  const [detail, setDetail] = useState<AiAgentDTO | null>(null);

  const fetchDetail = useCallback(async (agentId: string) => {
    const agent = await getAgentById(agentId);
    setDetail(agent);
    return agent;
  }, []);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const { id: agentId } = (e as CustomEvent<{ id: string }>).detail;
      setId(agentId);
      setOpen(true);
    };
    window.addEventListener("agents:view:open", onOpen);
    return () => window.removeEventListener("agents:view:open", onOpen);
  }, []);

  const character: CharacterDTO | undefined = characters.find((c) => c.id === detail?.character_id);

  return (
    <DetailSheet
      id={id}
      open={open}
      onOpenChange={setOpen}
      fetchDetail={fetchDetail}
      title="Detalle del agente"
      skeleton={<div className="animate-pulse h-2/5 bg-secondary rounded rounded-b-4xl" />}
    >
      {detail && (
        <div className="space-y-4">
          <div className="-m-4 relative mb-0">
            <div className={cn("flex h-44 items-end justify-center rounded-b-4xl bg-muted", character && characterStyle(character).background)}>
              {character?.avatar_url ? (
                <Image width={160} height={160} alt={detail.name} src={character.avatar_url} className="relative" />
              ) : (
                <Bot className="mb-6 size-20 text-foreground/40" aria-hidden />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4">
            <span
              className={cn(
                "h-3 w-3 rounded-full",
                detail.status === "active" ? "bg-success" : detail.status === "paused" ? "bg-warning" : "bg-muted-foreground",
              )}
              aria-hidden
            />
            <h1 className="text-2xl font-bold">{detail.name}</h1>
            <Badge variant="secondary" className="ml-auto">{AGENT_STATUS_LABELS[detail.status]}</Badge>
          </div>

          <div className="text-sm text-muted-foreground">
            {AI_PROVIDER_LABELS[detail.provider]} · <span className="font-mono">{detail.model}</span>
          </div>

          {detail.skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {detail.skills.map((skill) => (
                <Badge variant="secondary" key={skill}>{skill}</Badge>
              ))}
            </div>
          )}

          <div>
            <h3 className="mb-1 text-sm font-medium">Prompt del sistema</h3>
            <p className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 text-sm">
              {detail.system_prompt}
            </p>
          </div>

          <div>
            <h3 className="mb-1 text-sm font-medium">Intenciones asignadas</h3>
            {detail.intentions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin intenciones: el agente responde solo con su prompt.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {detail.intentions.map((intention) => (
                  <Badge key={intention.intention_id} variant="outline">{intention.code}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DetailSheet>
  );
}
