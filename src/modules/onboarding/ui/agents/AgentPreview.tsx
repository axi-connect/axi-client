"use client";

import { Mic, Plus } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { AgentTone } from "@/modules/onboarding/domain/agent-templates";
import { previewConversation } from "@/modules/onboarding/ui/agents/agent-preview-copy";

/**
 * El teléfono de vista previa (paso «Agentes», aprobado 2026-09-05): una
 * conversación de ejemplo que cambia en vivo con el nombre, el tono y la
 * personalidad que el dueño está eligiendo. Ve a quién está creando antes de
 * crearlo. Puro y sin backend: el copy vive en `agent-preview-copy.ts`.
 *
 * El área de chat tiene **alto fijo** (corrección del dueño al mockup): el
 * teléfono no crece mientras entran los mensajes. Los mensajes se re-animan al
 * cambiar el tono (la `key` lleva el tono) con la entrada finita
 * `.animate-msg-in`; con reduced-motion aparecen sin movimiento. Las burbujas
 * del agente van en violeta al 12 %: es el acento de la IA, no una selección.
 */
export function AgentPreview({
  name,
  tone,
  characterName,
  companyName,
  nicheCode,
  className,
}: {
  name: string;
  tone: AgentTone;
  characterName: string | null;
  companyName: string | null;
  nicheCode: string | null;
  className?: string;
}) {
  const shownName = name.trim() || "Tu agente";
  const messages = previewConversation({ name: shownName, tone, companyName, nicheCode });

  return (
    <div
      data-testid="agent-preview"
      aria-label="Vista previa de la conversación"
      className={cn(
        "bg-background border-border flex w-[280px] max-w-full flex-col gap-2.5 rounded-[36px] border p-3 pb-4 text-left",
        "shadow-[0_30px_80px_rgb(0_0_0/.16),inset_0_0_0_6px_color-mix(in_srgb,var(--foreground)_6%,transparent)]",
        className,
      )}
    >
      <div className="text-muted-foreground flex items-center justify-between px-3.5 pt-0.5 text-[10.5px] font-semibold" aria-hidden="true">
        <span>9:41</span>
        <span className="flex gap-1">
          <i className="bg-foreground/40 block h-2 w-3 rounded-sm" />
          <i className="bg-foreground/40 block h-2 w-4 rounded-sm" />
        </span>
      </div>
      <div className="border-border flex items-center gap-2.5 border-b px-2 pb-2.5">
        <span className="bg-brand-gradient grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold text-[color:var(--axi-on-color)]">
          {shownName[0]?.toUpperCase() ?? "A"}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13.5px] leading-tight font-semibold">{shownName}</p>
          <p className="text-muted-foreground truncate text-[11px]">{characterName ? `Personalidad: ${characterName} · en línea` : "en línea"}</p>
        </div>
      </div>
      <ul className="flex h-[262px] flex-col gap-1.5 overflow-hidden px-1 lg:h-[318px]" aria-label="Mensajes de ejemplo">
        {messages.map((message, index) => (
          <li
            key={`${tone}-${index}`}
            className={cn(
              "animate-msg-in motion-reduce:animate-none max-w-[86%] rounded-[14px] px-2.5 py-2 text-[12.5px] leading-[1.4]",
              message.from === "agent" ? "bg-accent-violet/12 self-start rounded-bl-[4px]" : "bg-foreground/8 self-end rounded-br-[4px]",
            )}
            style={{ animationDelay: `${index * 120}ms` }}
          >
            {message.text}
          </li>
        ))}
      </ul>
      <div className="border-border text-muted-foreground flex h-9 items-center gap-2 rounded-full border px-3 text-xs" aria-hidden="true">
        <Plus className="size-3.5" />
        <span className="flex-1">Escribe un mensaje</span>
        <Mic className="size-3.5" />
      </div>
    </div>
  );
}
