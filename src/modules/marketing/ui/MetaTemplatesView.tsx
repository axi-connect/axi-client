"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleDollarSign, Hourglass, Info, Plus, RefreshCw, WandSparkles } from "lucide-react";
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
  countTemplateVariables,
  rejectionReasonLabel,
  formatTemplateCost,
  HSM_STATUS_MAP,
  isUsableAsOpening,
  isUsableForMarketing,
  whyUnusable,
  type HsmTemplateDTO,
} from "@/modules/marketing/domain/template-catalog";
import { CreateHsmTemplateModal } from "@/modules/marketing/ui/components/CreateHsmTemplateModal";
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
/**
 * Techo del sondeo: 80 vueltas de 15 s son 20 minutos de pestaña visible. Meta
 * suele decidir en minutos; si tarda más, la pantalla deja de preguntar y el
 * botón «Sincronizar» sigue ahí. Un sondeo sin techo en una pestaña olvidada
 * son miles de peticiones por nada.
 */
const MAX_PENDING_POLLS = 80;

export function MetaTemplatesView() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("marketing:manage");
  const { showAlert } = useAlert();

  const [channels, setChannels] = useState<ChannelDTO[] | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<HsmTemplateDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [creating, setCreating] = useState(false);

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

  /**
   * «El estado se actualiza solo» era falso: el webhook de Meta escribe en la
   * base pero no avisa al navegador, y no hay cron de sync — el único
   * disparador era el botón «Sincronizar». Mientras haya alguna en revisión se
   * refresca sola; cuando no queda ninguna, se para y no cuesta nada.
   */
  const hasPending = templates?.some((t) => t.approval_status === "pending") ?? false;
  useEffect(() => {
    if (!hasPending || channelId === null) return;
    // Guardia por clave: sin ella, cambiar de canal con un sondeo en vuelo hace
    // que la respuesta del canal ANTERIOR llegue después y pinte sus plantillas
    // sobre las del nuevo.
    let cancelled = false;
    let polls = 0;
    const timer = setInterval(() => {
      // Meta puede tardar 48 h y una pestaña olvidada son miles de peticiones:
      // con la pestaña oculta no se sondea, y hay techo.
      if (document.hidden) return;
      if (polls >= MAX_PENDING_POLLS) {
        clearInterval(timer);
        return;
      }
      polls += 1;
      void listHsmTemplates({ channel_id: channelId })
        .then((rows) => {
          if (!cancelled) setTemplates(rows);
        })
        .catch(() => undefined);
    }, 15_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [hasPending, channelId]);

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
        glyph="connections"
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
  const openers = templates?.filter(isUsableAsOpening).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {/* F2: qué son y qué cuestan, antes de la tabla. Es lo que un tenant
          necesita entender para decidir crear una. */}
      <div className="grid gap-2 sm:grid-cols-3">
        <Step icon={WandSparkles} accent="text-accent-violet">
          <strong className="font-medium text-foreground">Crea</strong> el texto con variables ({"{{1}}"}, {"{{2}}"}) y un ejemplo por cada una.
        </Step>
        <Step icon={Hourglass} accent="text-info">
          <strong className="font-medium text-foreground">Meta revisa.</strong> Suele decidir en minutos; puede tardar hasta 48 h. Mientras haya alguna en revisión, esta pantalla se refresca sola.
        </Step>
        <Step icon={CircleDollarSign} accent="text-muted-foreground">
          <strong className="font-medium text-foreground">Cuesta por mensaje entregado.</strong> Colombia: utility {formatTemplateCost("utility")} · marketing {formatTemplateCost("marketing")}.
        </Step>
      </div>
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
            {openers} para abrir seguimientos · {usable} para promociones
          </span>
        )}

        <span className="flex-1" />

        {canManage && (
          <>
            <Button size="sm" variant="outline" disabled={syncing} onClick={() => void handleSync()}>
              <RefreshCw
                aria-hidden="true"
                className={syncing ? "size-4 animate-spin" : "size-4"}
              />
              {syncing ? "Sincronizando…" : "Sincronizar"}
            </Button>
            <Button size="sm" disabled={channelId === null} onClick={() => setCreating(true)}>
              <Plus aria-hidden="true" className="size-4" />
              Nueva plantilla
            </Button>
          </>
        )}
      </div>

      {channelId !== null && (
        <CreateHsmTemplateModal
          open={creating}
          channelId={channelId}
          onOpenChange={setCreating}
          onCreated={() => void load(channelId)}
        />
      )}

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
          glyph="connections"
          variant="solid"
          title="Este canal no tiene plantillas"
          description="Sin una plantilla aprobada, el agente no puede escribirle a quien lleve más de 24 h sin responder."
          action={
            canManage ? (
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus aria-hidden="true" className="size-4" />
                Crear la primera
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-background">
          <table className="w-full text-sm">
            <caption className="sr-only">Plantillas de Meta del canal</caption>
            <thead>
              <tr className="border-b border-border/60 bg-foreground/[0.02]">
                <Th>Plantilla</Th>
                <Th>Contenido</Th>
                <Th>Estado en Meta</Th>
                <Th>Costo / msg (CO)</Th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => {
                const reason = whyUnusable(template);
                return (
                  <tr key={template.id} className="border-b border-border/60 last:border-none">
                    <td className="px-4 py-2.5 align-top">
                      <div className="font-mono text-xs">{template.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {HSM_CATEGORY_LABELS[template.category]} · {template.language} ·{" "}
                        {countTemplateVariables(template.body) === null
                          ? "Meta no la aceptaría"
                          : `${String(countTemplateVariables(template.body))} ${
                              countTemplateVariables(template.body) === 1 ? "variable" : "variables"
                            }`}
                      </div>
                    </td>
                    <td className="max-w-md px-4 py-2.5 align-top text-xs text-muted-foreground">
                      <span className="line-clamp-2">{template.body}</span>
                    </td>
                    <td className="px-4 py-2.5 align-top">
                      <StatusBadge status={template.approval_status} map={HSM_STATUS_MAP} appearance="dot" />
                      {/* Qué implica el estado, en las palabras del operador. */}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {template.approval_status === "pending"
                          ? "Meta suele decidir en minutos; puede tardar hasta 48 h."
                          : template.approval_status === "rejected"
                            ? // El motivo REAL de Meta si lo mandó, traducido cuando
                              // viene como enum. La frase genérica decía qué hacer
                              // pero no qué estaba mal, que es lo único que sirve
                              // para corregirla.
                              (rejectionReasonLabel(template.rejected_reason) ??
                              "Corrige el texto y envíala como plantilla nueva: el nombre queda bloqueado 30 días.")
                            : template.approval_status === "paused"
                              ? "Varios destinatarios la marcaron como no deseada. Se reactiva si mejora la calidad."
                              : template.approval_status === "disabled"
                                ? "Meta la deshabilitó por reportes repetidos o una violación de política."
                                : (reason ?? "Sirve para abrir seguimientos del agente.")}
                      </p>
                      {/* La calidad es el aviso PREVIO a que Meta la pause: se
                          enseña solo cuando ya no es verde, que es cuando importa. */}
                      {typeof template.quality_score === "string" &&
                        template.quality_score.toUpperCase() !== "GREEN" && (
                          <p className="mt-1 text-xs text-warning">
                            Calidad {template.quality_score.toLowerCase()}: si baja más, Meta la
                            pausa.
                          </p>
                        )}
                    </td>
                    <td className="px-4 py-2.5 align-top font-mono text-xs tabular-nums">
                      {formatTemplateCost(template.category)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="flex gap-2.5 rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" />
        <span>
          El estado lo decide Meta y llega solo por su aviso; si sospechas que va atrasado, «Sincronizar» lo
          trae al momento. Las de <strong className="font-medium text-foreground">utility</strong> aprobadas son
          las que el agente usa para abrir seguimientos con contactos que llevan más de 24 h sin escribir.
        </span>
      </p>
    </div>
  );
}

function Step({
  icon: Icon,
  accent,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-secondary/70 px-3 py-2 text-xs text-muted-foreground">
      <Icon aria-hidden="true" className={`mt-0.5 size-3.5 shrink-0 ${accent}`} />
      <span>{children}</span>
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
