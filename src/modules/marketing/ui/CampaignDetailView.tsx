"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
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
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import BasicPagination from "@/shared/components/ui/pagination";
import type {
  CampaignDTO,
  CampaignRecipientDTO,
  CampaignStatsDTO,
} from "@/modules/marketing/domain/campaign";
import {
  campaignPollInterval,
  CAMPAIGN_STATUS_MAP,
  canCancelCampaign,
  canPauseCampaign,
  canResumeCampaign,
} from "@/modules/marketing/domain/campaign-state";
import {
  campaignPending,
  recipientMilestone,
  recipientName,
  RECIPIENT_STATUS_MAP,
  RECIPIENT_STATUS_ORDER,
} from "@/modules/marketing/domain/campaign-funnel";
import { RECIPIENT_STATUS_LABELS, type RecipientStatus } from "@/modules/marketing/domain/enums";
import { skipReasonBreakdown, skipReasonLabel } from "@/modules/marketing/domain/skip-reasons";
import {
  cancelCampaign,
  getCampaign,
  getCampaignStats,
  listCampaignRecipients,
  pauseCampaign,
  resumeCampaign,
} from "@/modules/marketing/infrastructure/services/campaigns-service.adapter";
import { StatTile } from "@/shared/components/features/stat-tile";
import { CampaignFunnel } from "./components/CampaignFunnel";

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
                  open: true,
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
        open: true,
      });
    } finally {
      setExporting(false);
    }
  }

  if (error !== null && campaign === null) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/35 bg-destructive/5 px-4 py-3">
          <p className="flex-1 text-sm text-muted-foreground">
            {errorMessage(error, "No pudimos cargar esta campaña")}
          </p>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackLink />
        <PageHeader
          title={campaign.name}
          badge={<StatusBadge status={campaign.status} map={CAMPAIGN_STATUS_MAP} />}
          description={describeCampaign(campaign)}
          actions={
            canManage && (
              <div className="flex flex-wrap gap-2">
                {canPauseCampaign(campaign.status) && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      runAction(pauseCampaign, {
                        title: `¿Pausar «${campaign.name}»?`,
                        description:
                          "Deja de enviar. Lo ya despachado no se puede recuperar, pero no saldrá ninguno más hasta que la reanudes.",
                        label: "Pausar",
                      })
                    }
                  >
                    Pausar
                  </Button>
                )}
                {canResumeCampaign(campaign.status) && (
                  <Button
                    onClick={() =>
                      runAction(resumeCampaign, {
                        title: `¿Reanudar «${campaign.name}»?`,
                        description: "Se vuelven a encolar los destinatarios pendientes.",
                        label: "Reanudar",
                      })
                    }
                  >
                    Reanudar
                  </Button>
                )}
                {canCancelCampaign(campaign.status) && (
                  <Button
                    variant="destructive"
                    onClick={() =>
                      runAction(cancelCampaign, {
                        title: `¿Cancelar «${campaign.name}»?`,
                        description:
                          "Los destinatarios pendientes quedan descartados y no se puede deshacer. Lo ya enviado sigue enviado.",
                        label: "Cancelar campaña",
                        destructive: true,
                      })
                    }
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            )
          }
        />
      </div>

      {stats === null ? (
        <FormSkeleton fields={4} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatTile label="Audiencia" value={stats.audience_total.toLocaleString("es-CO")} />
            <StatTile
              label="Despachados"
              value={(stats.sent + stats.delivered + stats.read + stats.failed).toLocaleString(
                "es-CO",
              )}
            />
            <StatTile
              label="Entregados"
              value={(stats.delivered + stats.read).toLocaleString("es-CO")}
              tone="success"
            />
            <StatTile label="Respondieron" value={stats.replies.toLocaleString("es-CO")} />
            <StatTile
              label="Recuperado"
              value={formatMoney(stats.revenue_cents)}
              tone="amber"
              hint={`${stats.conversions.toLocaleString("es-CO")} pedidos pagados`}
            />
          </div>

          <CampaignFunnel stats={stats} />

          {skips.length > 0 && (
            <section className="rounded-2xl border border-accent-amber/30 bg-accent-amber/[0.06] p-4 md:p-5">
              <h2 className="text-sm font-semibold">
                No recibieron el mensaje ·{" "}
                <span className="tabular-nums">{stats.skipped.toLocaleString("es-CO")}</span>
              </h2>
              <ul className="mt-3 flex flex-col gap-1.5">
                {skips.map((skip) => (
                  <li key={skip.reason} className="flex items-baseline gap-3 text-sm">
                    <span className="w-14 shrink-0 text-right font-semibold tabular-nums">
                      {skip.count.toLocaleString("es-CO")}
                    </span>
                    <span className="text-muted-foreground">{skip.label}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Destinatarios</h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="r-status">
              Filtrar destinatarios por estado
            </label>
            <select
              id="r-status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as RecipientStatus | typeof ALL);
                recipients.setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-background px-2.5 text-sm"
            >
              <option value={ALL}>Todos los estados</option>
              {RECIPIENT_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {RECIPIENT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void exportCsv()}
              disabled={exporting || recipients.total === 0}
            >
              <Download className="size-4" aria-hidden="true" />
              {exporting ? "Exportando…" : "Exportar CSV"}
            </Button>
          </div>
        </div>

        {recipients.error ? (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/35 bg-destructive/5 px-4 py-3">
            <p className="flex-1 text-sm text-muted-foreground">
              {errorMessage(recipients.error, "No pudimos cargar los destinatarios")}
            </p>
            <Button size="sm" variant="outline" onClick={() => void recipients.refresh()}>
              Reintentar
            </Button>
          </div>
        ) : recipients.items.length === 0 ? (
          <p className="rounded-2xl border border-border bg-background px-4 py-6 text-center text-sm text-muted-foreground">
            {recipients.loading
              ? "Cargando destinatarios…"
              : status !== ALL
                ? "Ningún destinatario en ese estado."
                : "Todavía no hay destinatarios: la audiencia se materializa al lanzar la campaña."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-background">
            <table className="w-full text-sm">
              <caption className="sr-only">Destinatarios de la campaña</caption>
              <thead>
                <tr className="border-b border-border/60 bg-foreground/[0.02]">
                  <Th>Contacto</Th>
                  <Th>Estado</Th>
                  <Th>Último hito</Th>
                  <Th>Detalle</Th>
                  <Th className="text-right">Ingreso</Th>
                </tr>
              </thead>
              <tbody>
                {recipients.items.map((recipient) => {
                  const milestone = recipientMilestone(recipient);
                  return (
                    <tr key={recipient.id} className="border-b border-border/60 last:border-none">
                      <td className="px-4 py-2.5">
                        <span className="font-medium">{recipientName(recipient)}</span>
                        {recipient.contact.phone && (
                          <span className="block text-xs tabular-nums text-muted-foreground">
                            {recipient.contact.phone}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={recipient.status} map={RECIPIENT_STATUS_MAP} />
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {milestone ? (
                          <>
                            {milestone.label}
                            {/* Relativo, no fecha: en una campaña en vuelo todo
                                pasó hoy y «06 de ago» no distingue nada. */}
                            <span className="block" title={formatShortDate(milestone.at)}>
                              {relativeTime(milestone.at)}
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {recipient.skip_reason
                          ? skipReasonLabel(recipient.skip_reason)
                          : recipient.error_code
                            ? recipient.error_code
                            : recipient.conversation_id
                              ? (
                                <Link
                                  href={`/inbox?conversation=${recipient.conversation_id}`}
                                  className="hover:text-brand"
                                >
                                  Ver conversación
                                </Link>
                              )
                              : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {recipient.revenue_cents ? formatMoney(recipient.revenue_cents) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {stillMoving
              ? "Quedan destinatarios por resolver: las cifras se siguen moviendo solas."
              : "Entregados y leídos se confirman por lotes cada ~5 min, así que pueden seguir subiendo un rato."}
          </p>
          {totalPages > 1 && (
            <BasicPagination
              totalPages={totalPages}
              page={recipients.page}
              onPageChange={recipients.setPage}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function BackLink() {
  return (
    <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
      <Link href="/marketing/campaigns">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Campañas
      </Link>
    </Button>
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

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={`px-4 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground ${className ?? ""}`}
    >
      {children}
    </th>
  );
}
