"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { metaTemplatesHref } from "@/core/lib/hsm-copy";
import { ChevronRight, Lock, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { EmptyState } from "@/shared/components/features/empty-state";
import { TableSkeleton } from "@/shared/components/features/loading";
import { BentoFigure, BentoTile, InkIsland, StatePill } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { listChannels, type ChannelDTO } from "@/modules/channels/public";
import { HSM_CATEGORY_LABELS } from "@/modules/marketing/domain/enums";
import {
  countTemplateVariables,
  formatTemplateCost,
  isUsableAsOpening,
  isUsableForMarketing,
  type HsmTemplateDTO,
} from "@/modules/marketing/domain/template-catalog";
import {
  HSM_STATUS_TONE,
  hsmEditHint,
  hsmNextUp,
  hsmQualityLabel,
  hsmStatusLabel,
  hsmStatusNote,
  namesLine,
} from "@/modules/marketing/domain/meta-template-view";
import { LoadError, TableCard, TD, TH } from "@/modules/marketing/ui/components/premium";
import {
  deleteHsmTemplate,
  listHsmTemplates,
  syncHsmTemplates,
} from "@/modules/marketing/infrastructure/services/templates-service.adapter";

/**
 * Plantillas de Meta (HSM) — lienzo «Plantillas de Meta premium» (2026-09-28).
 *
 * Son las ÚNICAS que pueden enviarse cuando pasaron más de 24 h desde el último
 * mensaje del cliente. Viven en la WABA de un canal `whatsapp_cloud`, no en el
 * tenant: por eso todo cuelga de un selector de canal y sin canal cloud no hay
 * nada que enseñar.
 *
 * El estado lo decide Meta y NO llega por WebSocket (el backend no publica ese
 * evento), así que mientras haya alguna en revisión la pantalla pregunta sola,
 * con techo, y lo dice.
 */
/**
 * Techo del sondeo: 80 vueltas de 15 s son 20 minutos de pestaña visible. Meta
 * suele decidir en minutos; si tarda más, la pantalla deja de preguntar —y
 * ahora lo dice en «Lo próximo»— y el botón «Sincronizar» sigue ahí. Un sondeo
 * sin techo en una pestaña olvidada son miles de peticiones por nada.
 */
const MAX_PENDING_POLLS = 80;
const POLL_MS = 15_000;

/**
 * `initialChannelId` y `pointId` llegan en la URL al volver de la página de una
 * plantilla (hsm-media F3): el canal en que se estaba y la plantilla que se
 * acaba de enviar, para señalarla en la lista como hacía la modal al cerrarse.
 */
export function MetaTemplatesView({
  initialChannelId = null,
  pointId = null,
}: {
  initialChannelId?: string | null;
  pointId?: string | null;
} = {}) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("marketing:manage");
  const { showAlert, showModal, closeModal } = useAlert();

  const [channels, setChannels] = useState<ChannelDTO[] | null>(null);
  // La que se está borrando: su papelera no admite un segundo clic mientras.
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<HsmTemplateDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  // La fila que un aviso mandó a mirar («Ver la plantilla», «Lo próximo»): se señala un momento.
  const [highlightId, setHighlightId] = useState<string | null>(null);
  // El sondeo llegó a su techo con alguna todavía en revisión.
  const [pollStopped, setPollStopped] = useState(false);

  useEffect(() => {
    listChannels()
      .then((res) => {
        // Solo los cloud: las HSM viven en la WABA, y wweb no las admite.
        const cloud = res.data.filter((c) => c.kind === "whatsapp_cloud");
        setChannels(cloud);
        setChannelId((cloud.find((c) => c.id === initialChannelId) ?? cloud[0])?.id ?? null);
      })
      .catch(() => setChannels([]));
    // `initialChannelId` sale de la URL y no cambia al limpiar `?point=`: no recarga.
  }, [initialChannelId]);

  const load = useCallback(async (id: string, options: { quiet?: boolean } = {}) => {
    // `quiet`: recarga con la lista de antes a la vista (tras un envío), sin volver a la silueta.
    if (!options.quiet) setTemplates(null);
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
    setPollStopped(false);
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
        if (!cancelled) setPollStopped(true);
        return;
      }
      polls += 1;
      void listHsmTemplates({ channel_id: channelId })
        .then((rows) => {
          if (!cancelled) setTemplates(rows);
        })
        .catch(() => undefined);
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [hasPending, channelId]);

  // Al volver de la página de una plantilla: se señala UNA vez y se limpia la
  // URL, o recargar la lista la volvería a señalar.
  const pointed = useRef(false);
  useEffect(() => {
    if (pointed.current || pointId === null || templates === null) return;
    pointed.current = true;
    pointAt(pointId);
    router.replace(metaTemplatesHref(channelId), { scroll: false });
  }, [pointId, templates, channelId, router]);

  /** La página de una plantilla: crear, o editar/corregir esta. */
  function openTemplate(template: HsmTemplateDTO | null) {
    const query = channelId === null ? "" : `?channel=${channelId}`;
    router.push(template === null ? `/settings/meta-templates/new${query}` : `/settings/meta-templates/${template.id}/edit${query}`);
  }

  /** Lleva a la fila y la señala un momento: el aviso dijo «está ahí», que se vea dónde. */
  function pointAt(templateId: string | null) {
    if (templateId === null) return;
    setHighlightId(templateId);
    requestAnimationFrame(() => document.getElementById(`hsm-${templateId}`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
    window.setTimeout(() => setHighlightId((current) => (current === templateId ? null : current)), 2400);
  }

  /**
   * Borrar no es deshacer: Meta **reserva el nombre 30 días** de toda plantilla
   * borrada salvo una rechazada (incidente 2026-09-28: se borró una en
   * revisión y no se pudo recrear), así que quien borre tiene que saberlo ANTES.
   */
  function confirmDelete(template: HsmTemplateDTO) {
    const consequences = "Las campañas y reglas que la usen dejarán de alcanzar a los contactos fríos.";
    showModal({
      title: `¿Borrar «${template.name}»?`,
      description:
        template.approval_status === "rejected"
          ? `Se borra en Meta y aquí. Como Meta la rechazó, el nombre queda libre al momento. ${consequences}`
          : `Se borra en Meta y aquí, y Meta reservará ese nombre e idioma durante 30 días: no podrás crear otra que se llame igual hasta entonces. ${consequences}`,
      actions: [
        { label: "Conservarla", variant: "outline" },
        {
          label: "Borrar",
          variant: "destructive",
          onClick: () => {
            closeModal();
            void (async () => {
              setDeletingId(template.id);
              try {
                await deleteHsmTemplate(template.id);
                showAlert({ tone: "success", title: "Plantilla borrada" });
                if (channelId !== null) await load(channelId, { quiet: true });
              } catch (err) {
                showAlert({ tone: "error", title: errorMessage(err, "Meta no dejó borrarla") });
              } finally {
                setDeletingId(null);
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
      const { synced, removed = 0, media_pending: mediaPending = 0 } = await syncHsmTemplates(channelId);
      // Lo que se retiró y los archivos de cabecera que faltan por traer, en una sola descripción.
      const notes = [
        removed > 0
          ? `${removed} ${removed === 1 ? "ya no está en Meta y se retiró" : "ya no están en Meta y se retiraron"} de aquí.`
          : null,
        mediaPending > 0
          ? `Faltan ${mediaPending} ${mediaPending === 1 ? "archivo de cabecera" : "archivos de cabecera"} por traer de Meta: sincroniza otra vez.`
          : null,
      ].filter((note): note is string => note !== null);
      showAlert({
        tone: "success",
        title:
          synced === 0 && removed === 0
            ? "Meta no devolvió plantillas nuevas"
            : `${synced} ${synced === 1 ? "plantilla sincronizada" : "plantillas sincronizadas"}`,
        ...(notes.length > 0 ? { description: notes.join(" ") } : {}),
      });
      await load(channelId, { quiet: true });
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "Meta rechazó la sincronización") });
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
        description="Las plantillas de Meta viven en la cuenta de WhatsApp Business de un canal Cloud. Conecta uno para poder escribirle a tus clientes pasadas las 24 h."
        action={
          <Button variant="outline" asChild>
            <Link href="/settings/channels">Ir a canales</Link>
          </Button>
        }
      />
    );
  }

  const usable = templates?.filter(isUsableForMarketing).length ?? 0;
  const openers = templates?.filter(isUsableAsOpening).length ?? 0;
  const next = hsmNextUp(templates ?? []);
  const selectedChannel = channels.find((channel) => channel.id === channelId);
  const channelLabel = (channel: ChannelDTO) =>
    `${channel.name}${channel.display_phone_number ? ` · ${channel.display_phone_number}` : ""}`;
  const syncButton = (
    <Button size="sm" variant="outline" className="rounded-full" disabled={syncing || channelId === null} onClick={() => void handleSync()}>
      <RefreshCw aria-hidden="true" className={syncing ? "size-4 animate-spin" : "size-4"} />
      {syncing ? "Sincronizando…" : "Sincronizar con Meta"}
    </Button>
  );

  /** Editar (o «Corregir», si Meta la rechazó) y borrar, en la fila: la tabla scrollea y un menú no portalizado se recortaría. */
  function rowActions(template: HsmTemplateDTO) {
    const hint = hsmEditHint(template);
    const fixing = template.approval_status === "rejected" && template.editable;
    return (
      <div className="flex flex-col gap-1.5 @xl:items-end">
        <div className="flex items-center gap-1 @xl:justify-end">
          {/* El servidor dice si Meta deja editar y por qué no: aquí no se repite ninguna regla suya. */}
          <Button
            variant={fixing ? "contrast" : "outline"}
            size="sm"
            className="rounded-full"
            disabled={!template.editable}
            title={hint}
            onClick={() => openTemplate(template)}
          >
            <Pencil aria-hidden className="size-3.5" />
            <span className="hidden sm:inline">{fixing ? "Corregir" : "Editar"}</span>
            <span className="sr-only sm:hidden">
              {fixing ? "Corregir" : "Editar"} {template.name}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive size-9 rounded-full"
            aria-label={`Borrar ${template.name}`}
            disabled={template.approval_status === "disabled" || deletingId === template.id}
            onClick={() => confirmDelete(template)}
          >
            <Trash2 aria-hidden className="size-4" />
          </Button>
        </div>
        {hint !== undefined && (
          <p className="text-muted-foreground max-w-60 text-xs text-pretty whitespace-normal @xl:text-right">{hint}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-muted-foreground max-w-2xl text-sm text-pretty">
          Pasadas 24 h desde el último mensaje del cliente, WhatsApp solo deja escribir con una plantilla aprobada por
          Meta. Meta suele decidir en minutos (hasta 48 h); mientras haya alguna en revisión, esta pantalla se refresca
          sola.
        </p>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            {syncButton}
            <Button size="sm" className="rounded-full" disabled={channelId === null} onClick={() => openTemplate(null)}>
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
              title={selectedChannel ? channelLabel(selectedChannel) : undefined}
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
          {templates !== null && error === null && (
            <p className="text-muted-foreground text-xs">
              {templates.length} {templates.length === 1 ? "plantilla" : "plantillas"} en su cuenta de WhatsApp Business
            </p>
          )}
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

      {templates !== null && error === null && (
        <NextUpIsland
          rejected={next.rejected}
          pending={next.pending}
          lowQuality={next.lowQuality}
          pollStopped={pollStopped}
          canManage={canManage}
          syncing={syncing}
          onFix={(template) => (template.editable ? openTemplate(template) : pointAt(template.id))}
          onPoint={pointAt}
          onSync={() => void handleSync()}
        />
      )}

      {!canManage && templates !== null && templates.length > 0 && (
        <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
          <StatePill tone="neutral">
            <Lock aria-hidden className="size-3" />
            Solo lectura
          </StatePill>
          Puedes ver las plantillas y su estado. Crearlas, corregirlas y borrarlas lo hace quien administra marketing.
        </p>
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
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" className="rounded-full" onClick={() => openTemplate(null)}>
                  <Plus aria-hidden="true" className="size-4" />
                  Crear la primera
                </Button>
                {syncButton}
              </div>
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
                {canManage && (
                  <TableHead className={`${TH} hidden @xl:table-cell`}>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => {
                const variables = countTemplateVariables(template.body);
                const quality = template.approval_status === "approved" ? hsmQualityLabel(template.quality_score) : null;
                return (
                  <TableRow
                    key={template.id}
                    id={`hsm-${template.id}`}
                    className={cn(
                      "scroll-mt-24 transition-colors duration-500",
                      template.approval_status === "rejected" && "bg-destructive/[0.035]",
                      highlightId === template.id && "bg-accent",
                    )}
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
                      {canManage && <div className="mt-2 @xl:hidden">{rowActions(template)}</div>}
                    </TableCell>
                    <TableCell className={`${TD} text-muted-foreground hidden max-w-sm align-top text-sm whitespace-normal @6xl:table-cell`}>
                      <span className="line-clamp-2">{template.body}</span>
                    </TableCell>
                    <TableCell className={`${TD} max-w-xs align-top whitespace-normal`}>
                      <StatePill tone={HSM_STATUS_TONE[template.approval_status]}>
                        {hsmStatusLabel(template.approval_status)}
                      </StatePill>
                      {/* Qué implica el estado, en las palabras del operador. */}
                      <p className="text-muted-foreground mt-1.5 text-xs text-pretty">{hsmStatusNote(template)}</p>
                      {/* La calidad es el aviso PREVIO a que Meta la pause: solo cuando ya no es verde. */}
                      {quality !== null && (
                        <p className="mt-1 flex items-start gap-1.5 text-xs text-pretty">
                          <span aria-hidden="true" className="bg-warning mt-1.5 size-1.5 shrink-0 rounded-full" />
                          Calidad {quality}: si baja más, Meta la pausa.
                        </p>
                      )}
                    </TableCell>
                    <TableCell className={`${TD} hidden align-top text-right font-mono text-xs whitespace-nowrap @3xl:table-cell`}>
                      {formatTemplateCost(template.category)}
                    </TableCell>
                    {canManage && (
                      <TableCell className={`${TD} hidden align-top @xl:table-cell`}>{rowActions(template)}</TableCell>
                    )}
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
 * «Lo próximo» (§9.5, una isla por pantalla): lo que hay que corregir, lo que
 * espera a Meta y lo que está por pausarse. Sin nada de eso no se pinta: una
 * isla vacía celebraría sin decir qué sigue.
 */
function NextUpIsland({
  rejected,
  pending,
  lowQuality,
  pollStopped,
  canManage,
  syncing,
  onFix,
  onPoint,
  onSync,
}: {
  rejected: HsmTemplateDTO[];
  pending: HsmTemplateDTO[];
  lowQuality: HsmTemplateDTO[];
  pollStopped: boolean;
  canManage: boolean;
  syncing: boolean;
  onFix: (template: HsmTemplateDTO) => void;
  onPoint: (templateId: string) => void;
  onSync: () => void;
}) {
  const items: Array<{ key: string; count: number; title: string; detail: string; onClick: () => void }> = [];
  const firstRejected = rejected[0];
  if (firstRejected !== undefined) {
    items.push({
      key: "rejected",
      count: rejected.length,
      title: rejected.length === 1 ? `${canManage ? "Corregir" : "Rechazada:"} ${firstRejected.name}` : "Rechazadas por Meta",
      detail:
        rejected.length === 1
          ? hsmStatusNote(firstRejected)
          : namesLine(rejected),
      onClick: () => (canManage && rejected.length === 1 ? onFix(firstRejected) : onPoint(firstRejected.id)),
    });
  }
  const firstPending = pending[0];
  if (firstPending !== undefined) {
    items.push({
      key: "pending",
      count: pending.length,
      title: pollStopped ? "Sigue en revisión" : "En revisión en Meta",
      detail: pollStopped
        ? `${namesLine(pending)} · la pantalla lo comprobó durante 20 minutos. Puede tardar hasta 48 h.`
        : `${namesLine(pending)} · suele decidir en minutos, hasta 48 h`,
      onClick: () => onPoint(firstPending.id),
    });
  }
  const firstLow = lowQuality[0];
  if (firstLow !== undefined) {
    items.push({
      key: "quality",
      count: lowQuality.length,
      title: `Calidad ${hsmQualityLabel(firstLow.quality_score) ?? ""}`.trim(),
      detail: `${namesLine(lowQuality)} · si baja más, Meta la pausa`,
      onClick: () => onPoint(firstLow.id),
    });
  }
  if (items.length === 0) return null;

  return (
    <InkIsland label="Lo próximo" className="@container gap-1 p-5">
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Lo próximo</h2>
        {pending.length > 0 &&
          (pollStopped ? (
            <span className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">Dejamos de comprobar</span>
              {canManage && (
                <Button size="sm" variant="contrast" className="rounded-full" disabled={syncing} onClick={onSync}>
                  {syncing ? "Sincronizando…" : "Sincronizar con Meta"}
                </Button>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <span aria-hidden="true" className="border-warning size-2.5 animate-spin rounded-full border-2 border-r-transparent motion-reduce:animate-none" />
              Comprobando cada 15 s si Meta ya decidió
            </span>
          ))}
      </div>
      <ul className="relative z-10 grid gap-x-6 @3xl:grid-cols-3">
        {items.map((item) => (
          <li key={item.key} className="min-w-0">
            <button
              type="button"
              onClick={item.onClick}
              className="hover:bg-foreground/5 flex w-full min-w-0 items-center gap-3.5 rounded-2xl px-1 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="font-heading min-w-9 text-3xl leading-none font-bold tabular-nums">{item.count}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-semibold" title={item.title}>
                  {item.title}
                </span>
                <span className="text-muted-foreground line-clamp-2 text-xs text-pretty [overflow-wrap:anywhere]">{item.detail}</span>
              </span>
              <ChevronRight aria-hidden className="text-muted-foreground size-4 shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </InkIsland>
  );
}
