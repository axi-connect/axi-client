"use client";

import Link from "next/link";
import { Sparkle } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { ChannelKindIcon, type ChannelKind } from "@/modules/channels/public";
import {
  CHANNEL_STATUS_TEXT,
  channelKindLabel,
  systemLevel,
  type ChannelHealth,
  type HealthLevel,
} from "@/modules/dashboard/domain/health";
import type { Section } from "@/modules/dashboard/infrastructure/stores/dashboard.store";
import type { UsageSummaryDTO } from "@/modules/dashboard/domain/dashboard";
import { TileError, TileSkeleton } from "@/modules/dashboard/ui/components/parts";
import { BentoTile, StatePill, type StatePillTone } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";

const LEVEL_TONE: Record<HealthLevel, StatePillTone> = { ok: "success", warning: "warning", critical: "destructive" };
const LEVEL_DOT: Record<HealthLevel, string> = { ok: "bg-success", warning: "bg-warning", critical: "bg-destructive" };

function summary(channels: ChannelHealth[], aiPaused: boolean): string {
  const down = channels.filter((channel) => channel.level === "critical").length;
  if (down > 0) return down === 1 ? "1 canal caído" : `${String(down)} canales caídos`;
  if (channels.some((channel) => channel.level === "warning")) return "Revisar";
  if (aiPaused) return "IA en pausa";
  return "Todo funciona";
}

/**
 * ¿Está todo funcionando? — los canales (GET /channels, en vivo por
 * `channel.status_changed`) y la IA (`usage.ai_paused`). El estado de cada
 * canal va en su punto; el texto, en foreground (§9.5, StatePill).
 */
export function SystemHealthPanel({
  channels,
  usage,
  onRetry,
  className,
}: {
  channels: Section<ChannelHealth[]>;
  usage: Section<UsageSummaryDTO>;
  onRetry: () => Promise<void>;
  className?: string;
}) {
  const label = "Estado del sistema";
  if (channels.status === "error") {
    return (
      <TileError label={label} message={channels.error ?? "No se pudo cargar el estado de los canales."} onRetry={onRetry} className={className} />
    );
  }
  if (channels.data === null) return <TileSkeleton label={label} lines={3} className={className} />;

  const list = channels.data;
  const aiPaused = usage.data?.ai_paused ?? false;
  const level = systemLevel(list, usage.data);

  if (list.length === 0) {
    return (
      <BentoTile label={label} aside={<StatePill tone="warning">Sin canales</StatePill>} className={className}>
        <div className="flex flex-1 flex-col items-start gap-2">
          <p className="text-sm font-semibold">Ningún canal conectado</p>
          <p className="text-muted-foreground text-xs text-pretty">WhatsApp, Instagram o Messenger: con uno basta para empezar a recibir conversaciones.</p>
          <Button asChild variant="outline" size="sm" className="mt-1 rounded-full px-4">
            <Link href="/settings/channels/connect">Conectar un canal</Link>
          </Button>
        </div>
      </BentoTile>
    );
  }

  return (
    <BentoTile label={label} aside={<StatePill tone={LEVEL_TONE[level]}>{summary(list, aiPaused)}</StatePill>} className={className}>
      <ul className="divide-border divide-y">
        {list.map((channel) => (
          <li key={channel.id} className="flex min-w-0 items-center gap-3 py-3">
            <span className={cn("bg-muted flex size-9 shrink-0 items-center justify-center rounded-xl", channel.level === "critical" && "opacity-45")}>
              <ChannelKindIcon kind={channel.kind as ChannelKind} className="size-5" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{channelKindLabel(channel.kind)}</span>
              <span className="text-muted-foreground truncate text-xs" title={channel.name}>
                {channel.name}
              </span>
            </span>
            <span className={cn("inline-flex items-center gap-1.5 text-xs whitespace-nowrap", channel.level === "critical" ? "font-medium" : "text-muted-foreground")}>
              <span aria-hidden="true" className={cn("size-1.5 rounded-full", LEVEL_DOT[channel.level])} />
              {CHANNEL_STATUS_TEXT[channel.status] ?? channel.status}
            </span>
          </li>
        ))}
      </ul>
      {usage.data ? (
        <div
          className={cn(
            "mt-auto flex items-center gap-2.5 rounded-2xl px-3.5 py-3 text-sm",
            aiPaused ? "bg-warning/10" : "bg-accent-violet/10",
          )}
        >
          {aiPaused ? (
            <span aria-hidden="true" className="bg-warning size-2 shrink-0 rounded-full" />
          ) : (
            <Sparkle aria-hidden="true" className="text-accent-violet size-4 shrink-0 fill-current" />
          )}
          {/* Dos piezas que bajan enteras: nunca «IA» en una línea y «activa» en otra. */}
          <span className="flex min-w-0 flex-wrap gap-x-1">
            <b className="font-semibold whitespace-nowrap">{aiPaused ? "IA en pausa" : "IA activa"}</b>
            <span className="text-muted-foreground whitespace-nowrap">{aiPaused ? "· llegó al límite del plan" : "· responde en tus canales"}</span>
          </span>
        </div>
      ) : null}
    </BentoTile>
  );
}
