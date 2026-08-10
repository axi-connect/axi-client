"use client";

import { useCallback, useEffect, useState } from "react";
import { Info, PlugZap, RefreshCw } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { EmptyState } from "@/shared/components/features/empty-state";
import { StatusBadge } from "@/shared/components/features/status-badge";
import { TableSkeleton } from "@/shared/components/features/loading";
import { Button } from "@/shared/components/ui/button";
import { listChannels, type ChannelDTO } from "@/modules/channels/public";
import { HSM_CATEGORY_LABELS } from "@/modules/marketing/domain/enums";
import {
  HSM_STATUS_MAP,
  isUsableForMarketing,
  whyUnusable,
  type HsmTemplateDTO,
} from "@/modules/marketing/domain/template-catalog";
import {
  listHsmTemplates,
  syncHsmTemplates,
} from "@/modules/marketing/infrastructure/services/templates-service.adapter";

/**
 * Plantillas de Meta (HSM).
 *
 * Son las ÚNICAS que pueden enviarse cuando pasaron más de 24 h desde el último
 * mensaje del cliente. Viven en la WABA de un canal `whatsapp_cloud`, no en el
 * tenant: por eso todo cuelga de un selector de canal y sin canal cloud no hay
 * nada que enseñar.
 *
 * El estado lo decide Meta y NO llega por WebSocket (el backend no publica ese
 * evento), así que el refresco es explícito: el botón «Sincronizar».
 */
export function MetaTemplatesView() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("marketing:manage");
  const { showAlert } = useAlert();

  const [channels, setChannels] = useState<ChannelDTO[] | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<HsmTemplateDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    listChannels()
      .then((res) => {
        // Solo los cloud: las HSM viven en la WABA, y wweb no las admite.
        const cloud = res.data.filter((c) => c.kind === "whatsapp_cloud");
        setChannels(cloud);
        setChannelId(cloud[0]?.id ?? null);
      })
      .catch(() => setChannels([]));
  }, []);

  const load = useCallback(async (id: string) => {
    setTemplates(null);
    try {
      setTemplates(await listHsmTemplates({ channel_id: id }));
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "No pudimos cargar las plantillas de Meta"));
      setTemplates([]);
    }
  }, []);

  useEffect(() => {
    if (channelId) void load(channelId);
  }, [channelId, load]);

  async function handleSync() {
    if (!channelId) return;
    setSyncing(true);
    try {
      const { synced } = await syncHsmTemplates(channelId);
      showAlert({
        tone: "success",
        title:
          synced === 0
            ? "Meta no devolvió plantillas nuevas"
            : `${synced} ${synced === 1 ? "plantilla sincronizada" : "plantillas sincronizadas"}`,
        open: true,
      });
      await load(channelId);
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "Meta rechazó la sincronización"),
        open: true,
      });
    } finally {
      setSyncing(false);
    }
  }

  if (channels === null) return <TableSkeleton rows={4} />;

  if (channels.length === 0) {
    return (
      <EmptyState
        icon={PlugZap}
        accent="amber"
        title="No tienes ningún canal de WhatsApp Cloud"
        description="Las plantillas de Meta viven en la cuenta de WhatsApp Business de un canal Cloud. Conecta uno para poder escribirle a tus clientes pasadas las 24 horas."
        action={
          <Button variant="outline" asChild>
            <a href="/workspace">Ir a canales</a>
          </Button>
        }
      />
    );
  }

  const usable = templates?.filter(isUsableForMarketing).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="hsm-channel">
          Canal
        </label>
        <select
          id="hsm-channel"
          value={channelId ?? ""}
          onChange={(e) => setChannelId(e.target.value)}
          className="h-9 min-w-56 rounded-md border border-input bg-background px-2.5 text-sm"
        >
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              {channel.name}
              {channel.display_phone_number ? ` · ${channel.display_phone_number}` : ""}
            </option>
          ))}
        </select>

        {templates !== null && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {usable} de {templates.length} sirven para promociones
          </span>
        )}

        <span className="flex-1" />

        {canManage && (
          <Button size="sm" variant="outline" disabled={syncing} onClick={() => void handleSync()}>
            <RefreshCw
              aria-hidden="true"
              className={syncing ? "size-4 animate-spin" : "size-4"}
            />
            {syncing ? "Sincronizando…" : "Sincronizar"}
          </Button>
        )}
      </div>

      {error !== null ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/35 bg-destructive/5 px-4 py-3">
          <p className="flex-1 text-sm text-muted-foreground">{error}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => channelId && void load(channelId)}
          >
            Reintentar
          </Button>
        </div>
      ) : templates === null ? (
        <TableSkeleton rows={4} />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          accent="amber"
          variant="solid"
          title="Este canal no tiene plantillas"
          description="Créalas en el administrador de WhatsApp de Meta y pulsa Sincronizar para traerlas aquí."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-background">
          <table className="w-full text-sm">
            <caption className="sr-only">Plantillas de Meta del canal</caption>
            <thead>
              <tr className="border-b border-border/60 bg-foreground/[0.02]">
                <Th>Nombre</Th>
                <Th>Idioma</Th>
                <Th>Categoría</Th>
                <Th>Estado</Th>
                <Th>Contenido</Th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => {
                const reason = whyUnusable(template);
                return (
                  <tr key={template.id} className="border-b border-border/60 last:border-none">
                    <td className="px-4 py-2.5 font-mono text-xs">{template.name}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {template.language}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {HSM_CATEGORY_LABELS[template.category]}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={template.approval_status} map={HSM_STATUS_MAP} />
                    </td>
                    <td className="max-w-md px-4 py-2.5 text-xs text-muted-foreground">
                      {/* Por qué NO sirve pesa más que el texto: evita que alguien
                          elija una `utility` aprobada y falle al lanzar. */}
                      {reason ?? <span className="line-clamp-2">{template.body}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="flex gap-2.5 rounded-xl border border-info/25 bg-info/5 px-4 py-3 text-sm text-muted-foreground">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" />
        <span>
          El estado lo decide Meta y puede tardar horas.{" "}
          <strong className="font-medium text-foreground">No llega solo:</strong> pulsa
          «Sincronizar» para traer el estado más reciente.
        </span>
      </p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="px-4 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground"
    >
      {children}
    </th>
  );
}
