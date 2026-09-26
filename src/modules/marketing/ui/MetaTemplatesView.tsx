"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { EmptyState } from "@/shared/components/features/empty-state";
import { StatusBadge } from "@/shared/components/features/status-badge";
import { TableSkeleton } from "@/shared/components/features/loading";
import { BentoFigure, BentoTile } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
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
import { LoadError, TableCard, TD, TH } from "@/modules/marketing/ui/components/premium";
import {
  deleteHsmTemplate,
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
  const { showAlert, showModal, closeModal } = useAlert();

  const [channels, setChannels] = useState<ChannelDTO[] | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<HsmTemplateDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<HsmTemplateDTO | null>(null);

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

  /**
   * Borrar no es deshacer: Meta **bloquea el nombre 30 días** si la plantilla
   * estaba aprobada, así que quien borre tiene que saberlo ANTES.
   */
  async function confirmDelete(template: HsmTemplateDTO) {
    showModal({
      title: `¿Borrar «${template.name}»?`,
      description:
        template.approval_status === "approved"
          ? "Estaba aprobada, así que Meta bloqueará ese nombre durante 30 días: no podrás crear otra que se llame igual. Las campañas y reglas que la usen dejarán de alcanzar a los contactos fríos."
          : "Se borra en Meta y aquí. Las campañas y reglas que la usen dejarán de alcanzar a los contactos fríos.",
      actions: [
        { label: "Conservarla", variant: "outline", asClose: true },
        {
          label: "Borrar",
          variant: "destructive",
          onClick: () => {
            closeModal();
            void (async () => {
              try {
                await deleteHsmTemplate(template.id);
                showAlert({ tone: "success", title: "Plantilla borrada" });
                if (channelId !== null) await load(channelId);
              } catch (err) {
                showAlert({
                  tone: "error",
                  title: errorMessage(err, "Meta no dejó borrarla"),
                });
              }
            })();
          },
        },
      ],
    });
  }

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
      });
      await load(channelId);
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "Meta rechazó la sincronización"),
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

  /** Editar y borrar, en la fila: la tabla scrollea y un menú no portalizado se recortaría. */
  function rowActions(template: HsmTemplateDTO) {
    return (
      <>
                      <div className="flex items-center gap-1 @xl:justify-end">
                        {/* El servidor dice si Meta deja editar y por qué no: aquí no se repite ninguna regla suya. */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          disabled={!template.editable}
                          title={editHint(template)}
                          onClick={() => setEditing(template)}
                        >
                          <Pencil aria-hidden className="size-3.5" />
                          <span className="hidden sm:inline">Editar</span>
                          <span className="sr-only sm:hidden">Editar {template.name}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive size-9 rounded-full"
                          aria-label={`Borrar ${template.name}`}
                          disabled={template.approval_status === "disabled"}
                          onClick={() => void confirmDelete(template)}
                        >
                          <Trash2 aria-hidden className="size-4" />
                        </Button>
                      </div>
                      {!template.editable && template.edit_blocked_reason !== null && (
                        <p className="text-muted-foreground mt-1 max-w-48 text-right text-xs text-pretty whitespace-normal">
                          {editHint(template)}
                        </p>
                      )}
      </>
    );
  }

  const channelLabel = (channel: ChannelDTO) =>
    `${channel.name}${channel.display_phone_number ? ` · ${channel.display_phone_number}` : ""}`;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-muted-foreground max-w-2xl text-sm text-pretty">
          Pasadas 24 h desde el último mensaje del cliente, WhatsApp solo deja escribir con una plantilla aprobada por
          Meta. Meta suele decidir en minutos (hasta 48 h); mientras haya alguna en revisión, esta pantalla se refresca
          sola.
        </p>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="rounded-full" disabled={syncing} onClick={() => void handleSync()}>
              <RefreshCw aria-hidden="true" className={syncing ? "size-4 animate-spin" : "size-4"} />
              {syncing ? "Sincronizando…" : "Sincronizar con Meta"}
            </Button>
            <Button size="sm" className="rounded-full" disabled={channelId === null} onClick={() => setCreating(true)}>
              <Plus aria-hidden="true" className="size-4" />
              Nueva plantilla
            </Button>
          </div>
        )}
      </div>

      {/* Tres fichas de un tema (§9.5): de qué canal, cuántas sirven y cuánto cobra Meta. */}
      <div className="grid gap-4 md:grid-cols-3 [&>*]:min-w-0">
        <BentoTile label="Canal">
          <Select value={channelId ?? ""} onValueChange={(value: string) => setChannelId(value)}>
            <SelectTrigger
              className="h-10 w-full min-w-0 rounded-xl *:data-[slot=select-value]:block *:data-[slot=select-value]:truncate"
              aria-label="Canal de WhatsApp"
              title={channels.find((channel) => channel.id === channelId) ? channelLabel(channels.find((channel) => channel.id === channelId)!) : undefined}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {channels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  {channelLabel(channel)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </BentoTile>
        <BentoTile label="Aprobadas">
          <BentoFigure value={templates === null ? "…" : String(usable)} unit={usable === 1 ? "sirve para promociones" : "sirven para promociones"} />
          <p className="text-muted-foreground text-xs">
            {openers} {openers === 1 ? "abre" : "abren"} seguimientos del agente
          </p>
        </BentoTile>
        <BentoTile label="Costo por mensaje entregado">
          <BentoFigure value={formatTemplateCost("marketing")} size="md" />
          <p className="text-muted-foreground flex flex-wrap gap-x-1 text-xs">
            <span className="whitespace-nowrap">Marketing · utilidad {formatTemplateCost("utility")} ·</span>
            <span className="whitespace-nowrap">tarifa de Colombia</span>
          </p>
        </BentoTile>
      </div>

      {channelId !== null && (
        <CreateHsmTemplateModal
          // `key` distinta por plantilla: fuerza el remontaje y así los valores
          // se cargan del estado inicial, sin un efecto que sincronice props.
          key={editing?.id ?? "nueva"}
          open={creating || editing !== null}
          channelId={channelId}
          editing={editing}
          onOpenChange={(next) => {
            if (next) return;
            setCreating(false);
            setEditing(null);
          }}
          onCreated={() => {
            setEditing(null);
            void load(channelId);
          }}
        />
      )}

      {error !== null ? (
        <LoadError message={error} onRetry={() => (channelId ? load(channelId) : undefined)} />
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
        <TableCard>
          <Table>
            <caption className="sr-only">Plantillas de Meta del canal</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={`${TH} @md:min-w-44`}>Plantilla</TableHead>
                <TableHead className={`${TH} hidden @6xl:table-cell`}>Contenido</TableHead>
                <TableHead className={TH}>Estado en Meta</TableHead>
                <TableHead className={`${TH} hidden text-right @3xl:table-cell`}>Costo</TableHead>
                <TableHead className={`${TH} hidden @xl:table-cell`}>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => {
                const reason = whyUnusable(template);
                const variables = countTemplateVariables(template.body);
                return (
                  <TableRow
                    key={template.id}
                    className={template.approval_status === "rejected" ? "bg-destructive/[0.035]" : undefined}
                  >
                    <TableCell className={`${TD} align-top whitespace-normal`}>
                      <span className="block max-w-[11rem] truncate font-mono text-[13px] @xl:max-w-[15rem]" title={template.name}>
                        {template.name}
                      </span>
                      <span className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-1 text-xs">
                        <span className="whitespace-nowrap">
                          {HSM_CATEGORY_LABELS[template.category]} · {template.language} ·
                        </span>
                        <span className="whitespace-nowrap">
                          {variables === null
                            ? "Meta no la aceptaría"
                            : `${String(variables)} ${variables === 1 ? "variable" : "variables"}`}
                        </span>
                      </span>
                      {/* Con la tabla estrecha, las acciones bajan aquí: al lado del estado no caben. */}
                      <div className="mt-2 @xl:hidden">{rowActions(template)}</div>
                    </TableCell>
                    <TableCell className={`${TD} text-muted-foreground hidden max-w-sm align-top text-sm whitespace-normal @6xl:table-cell`}>
                      <span className="line-clamp-2">{template.body}</span>
                    </TableCell>
                    <TableCell className={`${TD} max-w-xs align-top whitespace-normal`}>
                      <StatusBadge status={template.approval_status} map={HSM_STATUS_MAP} appearance="dot" />
                      {/* Qué implica el estado, en las palabras del operador. */}
                      <p className="text-muted-foreground mt-1 text-xs text-pretty">
                        {template.approval_status === "pending"
                          ? "Meta suele decidir en minutos; puede tardar hasta 48 h."
                          : template.approval_status === "rejected"
                            ? // El motivo REAL de Meta si lo mandó, traducido cuando
                              // viene como enum: la frase genérica decía qué hacer
                              // pero no qué estaba mal.
                              (rejectionReasonLabel(template.rejected_reason) ??
                              "Corrige el texto y envíala como plantilla nueva: el nombre queda bloqueado 30 días.")
                            : template.approval_status === "paused"
                              ? "Varios destinatarios la marcaron como no deseada. Se reactiva si mejora la calidad."
                              : template.approval_status === "disabled"
                                ? "Meta la deshabilitó por reportes repetidos o una violación de política."
                                : (reason ?? "Sirve para abrir seguimientos del agente.")}
                      </p>
                      {/* La calidad es el aviso PREVIO a que Meta la pause: solo cuando ya no es verde. */}
                      {typeof template.quality_score === "string" && template.quality_score.toUpperCase() !== "GREEN" && (
                        <p className="mt-1 text-xs text-pretty">
                          Calidad {template.quality_score.toLowerCase()}: si baja más, Meta la pausa.
                        </p>
                      )}
                    </TableCell>
                    <TableCell className={`${TD} hidden align-top text-right font-mono text-xs @3xl:table-cell`}>
                      {formatTemplateCost(template.category)}
                    </TableCell>
                    <TableCell className={`${TD} hidden align-top @xl:table-cell`}>{rowActions(template)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableCard>
      )}
    </div>
  );
}

/**
 * Por qué no se puede editar y —cuando lo hay— desde cuándo sí. La hora
 * concreta es lo que convierte un error en una instrucción.
 */
function editHint(template: HsmTemplateDTO): string | undefined {
  if (template.editable) return undefined;
  const reason = template.edit_blocked_reason ?? "Meta no deja editarla ahora";
  if (template.edit_retry_at === null) return reason;
  const when = new Date(template.edit_retry_at).toLocaleString("es-CO", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${reason}. Podrás el ${when}.`;
}
