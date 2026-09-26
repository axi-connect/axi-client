"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { formatMoney, formatShortDate } from "@/core/lib/format";
import { relativeTime } from "@/core/lib/relative-time";
import { downloadCsv, toCsv } from "@/core/lib/csv";
import { useAlert } from "@/core/providers/alert-provider";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { useAuth } from "@/shared/auth/auth.hooks";
import type { ListQuery } from "@/shared/api/query";
import { usePaginatedList } from "@/shared/api/use-paginated-list";
import { StatusBadge } from "@/shared/components/features/status-badge";
import { FormSkeleton } from "@/shared/components/features/loading";
import { Button } from "@/shared/components/ui/button";
import BasicPagination from "@/shared/components/ui/pagination";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { BentoTile } from "@/shared/components/features/bento";
import { Island } from "@/shared/components/features/island";
import type {
  CampaignDTO,
  CampaignRecipientDTO,
  CampaignStatsDTO,
} from "@/modules/marketing/domain/campaign";
import {
  campaignDispatched,
  campaignPollInterval,
  campaignProgressPct,
  canCancelCampaign,
  canEditCampaign,
  canPauseCampaign,
  canResumeCampaign,
} from "@/modules/marketing/domain/campaign-state";
import {
  campaignPending,
  campaignFunnel,
  recipientMilestone,
  recipientName,
  stagePct,
  RECIPIENT_STATUS_MAP,
  RECIPIENT_STATUS_ORDER,
} from "@/modules/marketing/domain/campaign-funnel";
import { CAMPAIGN_STATUS_LABELS, RECIPIENT_STATUS_LABELS, type RecipientStatus } from "@/modules/marketing/domain/enums";
import { skipReasonBreakdown, skipReasonLabel } from "@/modules/marketing/domain/skip-reasons";
import {
  cancelCampaign,
  getCampaign,
  getCampaignStats,
  listCampaignRecipients,
  pauseCampaign,
  resumeCampaign,
} from "@/modules/marketing/infrastructure/services/campaigns-service.adapter";
import { LoadError, TableCard, TD, TH } from "./components/premium";
import { campaignEditHref } from "@/modules/marketing/domain/campaign-draft";

const PAGE_SIZE = 20;
const ALL = "__all__";

/**
 * Detalle de una campaña en vivo.
 *
 * Tres fuentes que se complementan y no se pisan:
 *  - REST al montar, para tener algo que enseñar.
 *  - WebSocket como señal PRIMARIA (`campaign_status_changed`, `campaign_progress`),
 *    filtrado a ESTA campaña: un evento de otra no toca nada aquí.
 *  - Polling derivado del estado para `delivered`/`read`, que el backend
 *    reconcilia por lotes cada 5 min y NO publica como evento.
 *
 * Ningún camino invalida "todo": cada señal pide exactamente lo que cambió.
 */
export function CampaignDetailView({ campaignId }: { campaignId: string }) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("marketing:manage");
  const { showAlert, showModal, closeModal } = useAlert();

  const [campaign, setCampaign] = useState<CampaignDTO | null>(null);
  const [stats, setStats] = useState<CampaignStatsDTO | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [status, setStatus] = useState<RecipientStatus | typeof ALL>(ALL);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [nextCampaign, nextStats] = await Promise.all([
        getCampaign(campaignId),
        getCampaignStats(campaignId),
      ]);
      setCampaign(nextCampaign);
      setStats(nextStats);
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, [campaignId]);

  /** Solo las cifras: es lo que mueve el polling y el progreso por WS. */
  const refreshStats = useCallback(async () => {
    try {
      setStats(await getCampaignStats(campaignId));
    } catch {
      // Un fallo puntual del refresco no debe borrar lo que ya se muestra.
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  // --- Tiempo real -------------------------------------------------------
  const { socket, connected } = useSocket("inbox");
  const wasConnected = useRef(false);

  useSocketEvent(socket, "marketing.campaign_status_changed", (payload) => {
    if (payload.campaign_id !== campaignId) return;
    setCampaign((current) => (current ? { ...current, status: payload.status } : current));
    void refreshStats();
  });

  useSocketEvent(socket, "marketing.campaign_progress", (payload) => {
    if (payload.campaign_id !== campaignId) return;
    void refreshStats();
  });

  useEffect(() => {
    // Reconexión: los eventos emitidos con el socket caído se perdieron y las
    // cifras habrían quedado desfasadas en silencio.
    if (connected && wasConnected.current) void load();
    wasConnected.current = connected;
  }, [connected, load]);

  // --- Polling de la entrega ---------------------------------------------
  const pollMs = campaign ? campaignPollInterval(campaign.status) : false;

  useEffect(() => {
    if (pollMs === false) return;
    const id = setInterval(() => void refreshStats(), pollMs);
    return () => clearInterval(id);
  }, [pollMs, refreshStats]);

  // --- Destinatarios ------------------------------------------------------
  const fetcher = useCallback(
    (params: ListQuery) =>
      listCampaignRecipients(campaignId, {
        ...(status !== ALL && { status }),
        page: params.page as number,
        page_size: params.page_size as number,
      }),
    [campaignId, status],
  );

  // Estable o `usePaginatedList` entra en bucle de fetch.
  const extraParams = useMemo(() => ({}), []);

  const recipients = usePaginatedList<CampaignRecipientDTO>({
    fetcher,
    pageSize: PAGE_SIZE,
    extraParams,
  });

  const totalPages = Math.max(1, Math.ceil(recipients.total / PAGE_SIZE));

  function runAction(
    action: (id: string) => Promise<void>,
    confirm: { title: string; description: string; label: string; destructive?: boolean },
  ) {
    showModal({
      title: confirm.title,
      description: confirm.description,
      actions: [
        { label: "Cancelar", variant: "outline", asClose: true },
        {
          label: confirm.label,
          variant: confirm.destructive ? "destructive" : "default",
          onClick: () => {
            closeModal();
            void (async () => {
              try {
                await action(campaignId);
                await load();
              } catch (err) {
                showAlert({
                  tone: "error",
                  title: errorMessage(err, "No se pudo completar la acción"),
                });
              }
            })();
          },
        },
      ],
    });
  }

  /**
   * El CSV baja TODOS los destinatarios, no la página visible: exportar 20 de
   * 1.200 sería una trampa. Se pagina hasta el final con un tope de seguridad.
   */
  async function exportCsv() {
    setExporting(true);
    try {
      const rows: CampaignRecipientDTO[] = [];
      const MAX_PAGES = 100;
      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const chunk = await listCampaignRecipients(campaignId, {
          ...(status !== ALL && { status }),
          page,
          page_size: 100,
        });
        rows.push(...chunk.data);
        if (rows.length >= chunk.meta.total || chunk.data.length === 0) break;
      }
      downloadCsv(
        `campana-${campaignId}-destinatarios.csv`,
        toCsv(rows, [
          { header: "Contacto", value: (r) => recipientName(r) },
          { header: "Teléfono", value: (r) => r.contact.phone },
          { header: "Estado", value: (r) => RECIPIENT_STATUS_LABELS[r.status] },
          { header: "Motivo", value: (r) => (r.skip_reason ? skipReasonLabel(r.skip_reason) : "") },
          { header: "Canal", value: (r) => r.channel_kind },
          { header: "Encolado", value: (r) => r.queued_at },
          { header: "Enviado", value: (r) => r.sent_at },
          { header: "Entregado", value: (r) => r.delivered_at },
          { header: "Leído", value: (r) => r.read_at },
          { header: "Respondió", value: (r) => r.replied_at },
          { header: "Ingreso (centavos)", value: (r) => r.revenue_cents },
        ]),
      );
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "No pudimos exportar los destinatarios"),
      });
    } finally {
      setExporting(false);
    }
  }

  if (error !== null && campaign === null) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <LoadError message={errorMessage(error, "No pudimos cargar esta campaña")} onRetry={load} />
      </div>
    );
  }

  if (campaign === null) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <FormSkeleton fields={6} />
      </div>
    );
  }

  const skips = stats ? skipReasonBreakdown(stats.skipped_by_reason) : [];
  const stillMoving = stats !== null && campaignPending(stats) > 0;
  const live = connected || pollMs !== false;
  const isDraft = campaign.status === "draft";
  // Un borrador se lleva desde el asistente («Continuar» arriba): aquí no hay envío que pausar ni cancelar.
  const flowActions =
    canManage && !isDraft && (canPauseCampaign(campaign.status) || canResumeCampaign(campaign.status) || canCancelCampaign(campaign.status));

  const pause = () =>
    runAction(pauseCampaign, {
      title: `¿Pausar «${campaign.name}»?`,
      description:
        "Deja de enviar. Lo ya despachado no se puede recuperar, pero no saldrá ninguno más hasta que la reanudes.",
      label: "Pausar",
    });
  const resume = () =>
    runAction(resumeCampaign, {
      title: `¿Reanudar «${campaign.name}»?`,
      description: "Se vuelven a encolar los destinatarios pendientes.",
      label: "Reanudar",
    });
  const cancel = () =>
    runAction(cancelCampaign, {
      title: `¿Cancelar «${campaign.name}»?`,
      description:
        "Los destinatarios pendientes quedan descartados y no se puede deshacer. Lo ya enviado sigue enviado.",
      label: "Cancelar campaña",
      destructive: true,
    });

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <BackLink />
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
            Campaña · {CAMPAIGN_STATUS_LABELS[campaign.status]}
          </p>
          <h1 className="font-heading text-[1.9rem] leading-[1.05] font-bold tracking-tight text-balance break-words sm:text-[2.5rem]">
            {campaign.name}
          </h1>
          <p className="text-muted-foreground text-sm text-pretty">{describeCampaign(campaign)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {live && campaign.status !== "draft" && campaign.status !== "cancelled" ? (
            <span className="text-muted-foreground inline-flex items-center gap-2 text-sm whitespace-nowrap">
              <span aria-hidden="true" className="bg-success ring-success/15 size-1.5 rounded-full ring-4" />
              Se actualiza sola
            </span>
          ) : null}
          {canManage && canEditCampaign(campaign.status) ? (
            <Button variant={campaign.status === "draft" ? "contrast" : "outline"} className="rounded-full" asChild>
              <Link href={campaignEditHref(campaign.id)}>{campaign.status === "draft" ? "Continuar" : "Editar"}</Link>
            </Button>
          ) : null}
        </div>
      </header>

      {stats === null ? (
        <FormSkeleton fields={4} />
      ) : isDraft ? (
        // Sin lanzar no hay camino, ventas ni destinatarios: tres tarjetas en cero no dicen nada.
        <ProgressTile campaign={campaign} stats={stats} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
          <ProgressTile campaign={campaign} stats={stats} className="md:col-span-2" />
          <BentoTile label="Lo que ya vendió">
            <p className="font-heading text-4xl leading-none font-bold tracking-tight tabular-nums">
              {formatMoney(stats.revenue_cents)}
            </p>
            <p className="text-muted-foreground text-sm">
              {stats.conversions.toLocaleString("es-CO")} {stats.conversions === 1 ? "pedido pagado" : "pedidos pagados"}
            </p>
            <p className="text-muted-foreground mt-auto text-xs text-pretty">
              Pedidos pagados después de su mensaje, dentro de la ventana de atribución.
            </p>
          </BentoTile>

          <MessagePath stats={stats} className="md:col-span-2 xl:col-span-3" />

          <BentoTile className="self-start" label="No lo recibieron" aside={<span className="text-sm font-semibold tabular-nums">{skips.reduce((sum, skip) => sum + skip.count, 0).toLocaleString("es-CO")}</span>}>
            {skips.length === 0 ? (
              <p className="text-muted-foreground text-sm text-pretty">Nadie se quedó por fuera, por ahora.</p>
            ) : (
              <ul className="divide-border divide-y">
                {skips.map((skip) => (
                  <li key={skip.reason} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0 text-pretty">{skip.label}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{skip.count.toLocaleString("es-CO")}</span>
                  </li>
                ))}
              </ul>
            )}
          </BentoTile>

          <section className="flex min-w-0 flex-col gap-3 md:col-span-2 xl:col-span-2" aria-label="Destinatarios">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
              <SegmentedControl
                value={status}
                onValueChange={(next) => {
                  setStatus(next);
                  recipients.setPage(1);
                }}
                label="Filtrar destinatarios por estado"
                size="sm"
                items={[
                  { value: ALL, label: "Todos" },
                  ...RECIPIENT_STATUS_ORDER.map((s) => ({ value: s, label: RECIPIENT_STATUS_LABELS[s] })),
                ]}
              />
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => void exportCsv()}
                disabled={exporting || recipients.total === 0}
              >
                <Download className="size-4" aria-hidden="true" />
                {exporting ? "Exportando…" : "Exportar CSV"}
              </Button>
            </div>
            {recipients.error ? (
              <LoadError
                message={errorMessage(recipients.error, "No pudimos cargar los destinatarios")}
                onRetry={recipients.refresh}
              />
            ) : recipients.items.length === 0 ? (
              <p className="border-border bg-card text-muted-foreground rounded-3xl border px-5 py-8 text-center text-sm text-pretty">
                {recipients.loading
                  ? "Cargando destinatarios…"
                  : status !== ALL
                    ? "Ningún destinatario en ese estado."
                    : "Todavía no hay destinatarios: la audiencia se materializa al lanzar la campaña."}
              </p>
            ) : (
              <TableCard>
                <Table>
                  <caption className="sr-only">Destinatarios de la campaña</caption>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className={`${TH} @md:min-w-44`}>Contacto</TableHead>
                      <TableHead className={`${TH} hidden @lg:table-cell`}>Estado</TableHead>
                      <TableHead className={`${TH} hidden @2xl:table-cell`}>Último paso</TableHead>
                      <TableHead className={`${TH} hidden @4xl:table-cell`}>Detalle</TableHead>
                      <TableHead className={`${TH} hidden text-right @xl:table-cell`}>Compró</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipients.items.map((recipient) => {
                      const milestone = recipientMilestone(recipient);
                      return (
                        <TableRow key={recipient.id}>
                          <TableCell className={`${TD} whitespace-normal`}>
                            <span className="block max-w-[16rem] truncate font-medium" title={recipientName(recipient)}>
                              {recipientName(recipient)}
                            </span>
                            {recipient.contact.phone && (
                              <span className="text-muted-foreground block text-xs whitespace-nowrap tabular-nums">
                                {recipient.contact.phone}
                              </span>
                            )}
                            {/* Con la tabla estrecha, el estado y el último paso suben aquí. */}
                            <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs @2xl:hidden">
                              <span className="@lg:hidden">
                                <StatusBadge status={recipient.status} map={RECIPIENT_STATUS_MAP} appearance="dot" />
                              </span>
                              {milestone ? (
                                <span className="text-muted-foreground whitespace-nowrap">
                                  {milestone.label} {relativeTime(milestone.at)}
                                </span>
                              ) : null}
                              {recipient.revenue_cents ? (
                                <span className="font-semibold whitespace-nowrap tabular-nums @xl:hidden">
                                  {formatMoney(recipient.revenue_cents)}
                                </span>
                              ) : null}
                            </span>
                          </TableCell>
                          <TableCell className={`${TD} hidden @lg:table-cell`}>
                            <StatusBadge status={recipient.status} map={RECIPIENT_STATUS_MAP} appearance="dot" />
                          </TableCell>
                          <TableCell className={`${TD} text-muted-foreground hidden text-sm @2xl:table-cell`}>
                            {milestone ? (
                              <>
                                {milestone.label}
                                {/* Relativo, no fecha: en una campaña en vuelo todo pasó hoy. */}
                                <span className="block text-xs" title={formatShortDate(milestone.at)}>
                                  {relativeTime(milestone.at)}
                                </span>
                              </>
                            ) : (
                              "Sin movimiento"
                            )}
                          </TableCell>
                          <TableCell className={`${TD} text-muted-foreground hidden max-w-xs text-sm whitespace-normal @4xl:table-cell`}>
                            {recipient.skip_reason ? (
                              skipReasonLabel(recipient.skip_reason)
                            ) : recipient.error_code ? (
                              recipient.error_code
                            ) : recipient.conversation_id ? (
                              <Link
                                href={`/inbox?conversation=${recipient.conversation_id}`}
                                className="text-foreground inline-flex min-h-6 items-center font-medium underline-offset-4 hover:underline"
                              >
                                Ver conversación
                              </Link>
                            ) : (
                              "Sin detalle"
                            )}
                          </TableCell>
                          <TableCell className={`${TD} hidden text-right tabular-nums @xl:table-cell`}>
                            {recipient.revenue_cents ? (
                              formatMoney(recipient.revenue_cents)
                            ) : (
                              <span className="text-muted-foreground">No</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
                  <p className="text-muted-foreground text-xs text-pretty">
                    {stillMoving
                      ? "Quedan destinatarios por resolver: las cifras se siguen moviendo solas."
                      : "Entregados y leídos se confirman por lotes cada ~5 min, así que pueden seguir subiendo un rato."}
                  </p>
                  {totalPages > 1 && (
                    <BasicPagination totalPages={totalPages} page={recipients.page} onPageChange={recipients.setPage} />
                  )}
                </div>
              </TableCard>
            )}
          </section>
        </div>
      )}

      {/* La barra de acción en tinta, pegada abajo (§9.5.1): pausar, reanudar o cancelar el envío. */}
      {flowActions ? (
        <Island
          as="footer"
          material="ink"
          role="region"
          aria-label="Acciones de la campaña"
          className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-3xl px-5 py-3 sm:rounded-full sm:py-2.5 sm:pr-2.5"
        >
          <p className="text-sm">
            <span className="font-semibold">{CAMPAIGN_STATUS_LABELS[campaign.status]}</span>
            {stats && campaignPending(stats) > 0 ? (
              <span className="text-muted-foreground"> · {campaignPending(stats).toLocaleString("es-CO")} en cola</span>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {canCancelCampaign(campaign.status) && (
              <Button variant="ghost" className="text-destructive hover:text-destructive rounded-full" onClick={cancel}>
                Cancelar envío
              </Button>
            )}
            {canPauseCampaign(campaign.status) && (
              <Button variant="glass" onClick={pause}>
                Pausar
              </Button>
            )}
            {canResumeCampaign(campaign.status) && (
              <Button variant="contrast" className="rounded-full" onClick={resume}>
                Reanudar
              </Button>
            )}
          </div>
        </Island>
      ) : null}
    </div>
  );
}

/**
 * El avance del despacho: cuántos salieron de la cola, y en una sola barra qué
 * pasó con ellos (entregados, los que no lo recibieron) y lo que falta.
 */
function ProgressTile({ campaign, stats, className }: { campaign: CampaignDTO; stats: CampaignStatsDTO; className?: string }) {
  if (campaign.status === "draft") {
    return (
      <BentoTile label="Audiencia" className={className}>
        <p className="font-heading text-2xl font-bold tracking-tight text-pretty">Se calcula al lanzar</p>
        <p className="text-muted-foreground text-sm text-pretty">
          Mientras sea borrador, la audiencia no se congela: quien entre o salga del segmento cuenta hasta el
          lanzamiento.
        </p>
      </BentoTile>
    );
  }
  const audience = stats.audience_total;
  const delivered = stats.delivered + stats.read;
  const lost = stats.skipped + stats.failed;
  const pending = campaignPending(stats);
  const share = (n: number) => (audience > 0 ? `${String((n / audience) * 100)}%` : "0%");
  return (
    // «Procesados», no «despachados»: incluye a quien se omitió (baja, sin ventana). El camino del mensaje
    // cuenta aparte lo que de verdad salió; con la misma palabra, las dos cifras parecerían contradecirse.
    <BentoTile label="Avance del envío" className={cn("gap-4", className)}>
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-heading text-[2.6rem] leading-none font-bold tracking-tight tabular-nums sm:text-5xl">
          {campaignDispatched(stats).toLocaleString("es-CO")}
        </span>
        <span className="text-muted-foreground text-[15px] whitespace-nowrap">
          de {audience.toLocaleString("es-CO")} procesados · <b className="text-foreground font-semibold">{campaignProgressPct(stats)} %</b>
        </span>
      </p>
      <div aria-hidden="true" className="flex h-3 gap-[3px]">
        <span className="bg-brand-gradient rounded-full" style={{ width: share(delivered + stats.sent) }} />
        <span className="bg-brand/35 rounded-full" style={{ width: share(lost) }} />
        <span className="bg-muted flex-1 rounded-full" />
      </div>
      <ul className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
        <li className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span aria-hidden="true" className="bg-brand size-1.5 rounded-full" />
          {(delivered + stats.sent).toLocaleString("es-CO")} salieron
        </li>
        <li className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span aria-hidden="true" className="bg-brand/35 size-1.5 rounded-full" />
          {lost.toLocaleString("es-CO")} no lo recibieron
        </li>
        <li className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span aria-hidden="true" className="bg-muted-foreground/40 size-1.5 rounded-full" />
          {pending.toLocaleString("es-CO")} en cola
        </li>
      </ul>
      <p className="text-muted-foreground text-xs">Meta confirma las entregas por lotes, cada ~5 minutos.</p>
    </BentoTile>
  );
}

/**
 * El camino del mensaje: despachados → entregados → leídos → respondieron →
 * compraron. Cada etapa es subconjunto de la anterior (`campaignFunnel`); el
 * porcentaje es sobre lo despachado, para que cuadre con las barras.
 */
function MessagePath({ stats, className }: { stats: CampaignStatsDTO; className?: string }) {
  const funnel = campaignFunnel(stats);
  const dispatched = funnel.find((stage) => stage.key === "dispatched")?.value ?? 0;
  const stages = [
    ...funnel.filter((stage) => stage.key !== "audience"),
  ];
  // Leídos va entre entregados y respondieron: el backend lo cuenta aparte (`read`, excluyente).
  stages.splice(2, 0, { key: "read", label: "Leídos", value: stats.read, hint: "Abrieron el mensaje." });
  return (
    <BentoTile label="El camino del mensaje" aside={<span className="text-muted-foreground text-xs">sobre lo despachado</span>} className={className}>
      <ol className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
        {stages.map((stage, index) => {
          const pct = index === 0 ? null : stagePct(dispatched, stage.value);
          const width = dispatched > 0 ? Math.max(0, Math.min(100, (stage.value / dispatched) * 100)) : 0;
          const last = stage.key === "conversions";
          return (
            <li key={stage.key} className="flex min-w-0 flex-col gap-2" title={stage.hint}>
              <span className="text-muted-foreground text-xs">{stage.label}</span>
              <span className="font-heading text-3xl leading-none font-bold tracking-tight tabular-nums">
                {stage.value.toLocaleString("es-CO")}
              </span>
              <span aria-hidden="true" className="bg-muted h-2 overflow-hidden rounded-full">
                <span
                  className={cn("block h-full rounded-full", last ? "bg-brand-gradient" : "bg-foreground")}
                  style={{ width: `${String(index === 0 ? 100 : width)}%`, opacity: last ? 1 : 0.85 - index * 0.13 }}
                />
              </span>
              <span className="text-muted-foreground text-xs">
                {index === 0 ? `de ${stats.audience_total.toLocaleString("es-CO")}` : pct === null ? "sin datos aún" : `${String(pct)} %`}
              </span>
            </li>
          );
        })}
      </ol>
    </BentoTile>
  );
}

function BackLink() {
  return (
    <Link
      href="/marketing/campaigns"
      className="text-muted-foreground hover:text-foreground inline-flex min-h-6 w-fit items-center gap-1.5 text-sm underline-offset-4 hover:underline"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Campañas
    </Link>
  );
}

/** De dónde salió la audiencia y con qué se le escribió. */
function describeCampaign(campaign: CampaignDTO): string {
  const audience = campaign.segment_id
    ? "Segmento guardado"
    : campaign.audience_filters
      ? "Filtros a medida"
      : "Todos los contactos";
  const content = campaign.template?.name
    ? `plantilla «${campaign.template.name}»`
    : campaign.hsm_channel_template_id
      ? "plantilla de Meta"
      : "sin contenido";
  const when = campaign.launched_at
    ? `lanzada el ${formatShortDate(campaign.launched_at)}`
    : campaign.scheduled_at
      ? `programada para el ${formatShortDate(campaign.scheduled_at)}`
      : "sin lanzar";
  return `${audience} · ${content} · ${when}`;
}
