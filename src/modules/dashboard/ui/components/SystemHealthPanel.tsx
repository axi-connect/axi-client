"use client";

import { AlertTriangle, CheckCircle2, Radio, Sparkles, XCircle } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { CardEmpty, DashboardCard } from "@/modules/dashboard/ui/components/MetricTile";
import type { HealthLevel, ChannelHealth } from "@/modules/dashboard/domain/health";
import type { Section } from "@/modules/dashboard/infrastructure/stores/dashboard.store";
import type { UsageSummaryDTO } from "@/modules/dashboard/domain/dashboard";

const CHANNEL_KIND_LABELS: Record<string, string> = {
  whatsapp_cloud: "WhatsApp",
  whatsapp_web: "WhatsApp Web",
  instagram_dm: "Instagram",
  facebook_messenger: "Messenger",
};

const STATUS_LABELS: Record<string, string> = {
  connected: "Conectado",
  connecting: "Conectando…",
  pending_setup: "Sin configurar",
  disconnected: "Desconectado",
  error: "Error",
};

function LevelIcon({ level }: { level: HealthLevel }) {
  if (level === "ok") return <CheckCircle2 aria-hidden className="size-4 text-success" />;
  if (level === "warning") return <AlertTriangle aria-hidden className="size-4 text-warning" />;
  return <XCircle aria-hidden className="size-4 text-destructive" />;
}

/**
 * ¿Está todo funcionando? — estado de canales (GET /channels) + flag de IA
 * pausada por límite (usage.ai_paused). Se actualiza en vivo por
 * channel.status_changed sin recargar.
 */
export function SystemHealthPanel({
  channels,
  usage,
}: {
  channels: Section<ChannelHealth[]>;
  usage: Section<UsageSummaryDTO>;
}) {
  if (channels.status === "loading" || channels.status === "idle") {
    return (
      <DashboardCard title="Estado del sistema">
        <div className="h-32 animate-pulse rounded-xl bg-secondary" role="status" aria-label="Cargando" />
      </DashboardCard>
    );
  }
  if (channels.status === "error" || channels.data === null) {
    return (
      <DashboardCard title="Estado del sistema">
        <p className="text-sm text-muted-foreground">
          {channels.error ?? "No se pudo cargar el estado de los canales."}
        </p>
      </DashboardCard>
    );
  }

  const aiPaused = usage.data?.ai_paused ?? false;

  return (
    <DashboardCard title="Estado del sistema">
      {channels.data.length === 0 ? (
        <CardEmpty
          icon={<Radio aria-hidden className="size-6" />}
          message="Aún no hay canales conectados. Conecta uno para empezar a recibir conversaciones."
        />
      ) : (
        <ul className="space-y-1">
          {channels.data.map((channel) => (
            <li key={channel.id} className="flex items-center gap-3 py-1.5">
              <LevelIcon level={channel.level} />
              <span className="flex-1 truncate text-sm">
                {CHANNEL_KIND_LABELS[channel.kind] ?? channel.kind}
                <span className="ml-1 text-xs text-muted-foreground">· {channel.name}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {STATUS_LABELS[channel.status] ?? channel.status}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div
        className={cn(
          "mt-3 flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm",
          aiPaused ? "bg-warning/10 text-warning" : "text-muted-foreground",
        )}
      >
        <Sparkles aria-hidden className="size-4" />
        {aiPaused ? "IA pausada por límite del plan" : "IA activa"}
      </div>
    </DashboardCard>
  );
}
