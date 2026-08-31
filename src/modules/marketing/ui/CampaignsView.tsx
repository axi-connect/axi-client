"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Plus } from "lucide-react";
import { formatShortDate } from "@/core/lib/format";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import type { ListQuery } from "@/shared/api/query";
import { usePaginatedList } from "@/shared/api/use-paginated-list";
import { EmptyState } from "@/shared/components/features/empty-state";
import { StatusBadge } from "@/shared/components/features/status-badge";
import { TableSkeleton } from "@/shared/components/features/loading";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import BasicPagination from "@/shared/components/ui/pagination";
import type { CampaignDTO } from "@/modules/marketing/domain/campaign";
import {
  campaignAudienceLabel,
  CAMPAIGN_STATUS_MAP,
  canCancelCampaign,
  canDeleteCampaign,
  canPauseCampaign,
  canResumeCampaign,
} from "@/modules/marketing/domain/campaign-state";
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_ORDER,
  type CampaignStatus,
} from "@/modules/marketing/domain/enums";
import {
  cancelCampaign,
  deleteCampaign,
  listCampaigns,
  pauseCampaign,
  resumeCampaign,
} from "@/modules/marketing/infrastructure/services/campaigns-service.adapter";

const PAGE_SIZE = 20;
const ALL = "__all__";

/** "8 ago, 9:00 a. m." — cuándo sale una campaña programada. */
function formatScheduledAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-CO", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Listado de campañas.
 *
 * NO muestra stats: el endpoint de lista no las trae y pedirlas por fila sería
 * una petición por campaña. El funnel vive en el detalle, que es donde se mira.
 * Las acciones se derivan de predicados puros del dominio, no de un `try/catch`
 * contra el backend — un botón que solo falla al pulsarlo es un botón que miente.
 */
export function CampaignsView() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("marketing:manage");
  const { showAlert, showModal, closeModal } = useAlert();
  const router = useRouter();

  const [status, setStatus] = useState<CampaignStatus | typeof ALL>(ALL);

  const fetcher = useCallback(
    (params: ListQuery) =>
      listCampaigns({
        ...(status !== ALL && { status }),
        page: params.page as number,
        page_size: params.page_size as number,
      }),
    [status],
  );

  // Estable o `usePaginatedList` entra en bucle de fetch.
  const extraParams = useMemo(() => ({}), []);

  const { items, total, loading, error, page, setPage, refresh } = usePaginatedList<CampaignDTO>({
    fetcher,
    pageSize: PAGE_SIZE,
    extraParams,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilter = status !== ALL;

  function runAction(
    campaign: CampaignDTO,
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
                await action(campaign.id);
                await refresh();
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

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Campañas"
        description="Envíos masivos a un segmento de tu base. Al lanzarlas, la audiencia y el contenido quedan congelados."
        actions={
          canManage && (
            <Button className="rounded-full" asChild>
              <Link href="/marketing/campaigns/new">
                <Plus className="size-4" aria-hidden="true" />
                Nueva campaña
              </Link>
            </Button>
          )
        }
      />

      {(total > 0 || hasFilter) && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="c-status">
            Filtrar por estado
          </label>
          <select
            id="c-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as CampaignStatus | typeof ALL);
              // Un filtro nuevo empieza en la página 1: el hook no lo hace solo.
              setPage(1);
            }}
            className="h-9 rounded-md border border-input bg-background px-2.5 text-sm"
          >
            <option value={ALL}>Todos los estados</option>
            {CAMPAIGN_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {CAMPAIGN_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <span className="text-xs tabular-nums text-muted-foreground">
            {total.toLocaleString("es-CO")} {total === 1 ? "campaña" : "campañas"}
          </span>
        </div>
      )}

      {loading && items.length === 0 ? (
        <TableSkeleton rows={5} />
      ) : error ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/35 bg-destructive/5 px-4 py-3">
          <p className="flex-1 text-sm text-muted-foreground">
            {errorMessage(error, "No pudimos cargar tus campañas")}
          </p>
          <Button size="sm" variant="outline" onClick={() => void refresh()}>
            Reintentar
          </Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          glyph="ai"
          title={hasFilter ? "Ninguna campaña en ese estado" : "Todavía no le has escrito a tu base"}
          description={
            hasFilter
              ? "Prueba con otro estado o quita el filtro."
              : "Una campaña le habla a muchos clientes a la vez: eliges a quién, qué les dices y cuándo sale. Los que pidieron no recibir promociones quedan fuera siempre."
          }
          action={
            hasFilter ? (
              <Button variant="outline" onClick={() => setStatus(ALL)}>
                Quitar filtro
              </Button>
            ) : (
              canManage && (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button className="rounded-full" asChild>
                    <Link href="/marketing/campaigns/new">Crear mi primera campaña</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/marketing/automations">Empezar por recuperar carritos</Link>
                  </Button>
                </div>
              )
            )
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-background">
            <table className="w-full text-sm">
              <caption className="sr-only">Listado de campañas</caption>
              <thead>
                <tr className="border-b border-border/60 bg-foreground/[0.02]">
                  <Th>Campaña</Th>
                  <Th>Estado</Th>
                  <Th className="text-right">Audiencia</Th>
                  <Th>Programada</Th>
                  <Th>Creada</Th>
                  <Th>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-border/60 last:border-none">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/marketing/campaigns/${campaign.id}`}
                        className="font-medium hover:text-brand"
                      >
                        {campaign.name}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {describeAudience(campaign)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={campaign.status} map={CAMPAIGN_STATUS_MAP} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {campaignAudienceLabel(campaign) ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs tabular-nums text-muted-foreground">
                      {campaign.scheduled_at ? formatScheduledAt(campaign.scheduled_at) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {formatShortDate(campaign.created_at)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {canManage && (
                        <CampaignMenu
                          campaign={campaign}
                          onPause={() =>
                            runAction(campaign, pauseCampaign, {
                              title: `¿Pausar «${campaign.name}»?`,
                              description:
                                "Deja de enviar. Los mensajes ya despachados no se pueden recuperar, pero no saldrá ninguno más hasta que la reanudes.",
                              label: "Pausar",
                            })
                          }
                          onResume={() =>
                            runAction(campaign, resumeCampaign, {
                              title: `¿Reanudar «${campaign.name}»?`,
                              description:
                                "Se vuelven a encolar los destinatarios que quedaron pendientes.",
                              label: "Reanudar",
                            })
                          }
                          onCancel={() =>
                            runAction(campaign, cancelCampaign, {
                              title: `¿Cancelar «${campaign.name}»?`,
                              description:
                                "Los destinatarios pendientes quedan descartados y no se puede deshacer. Lo ya enviado sigue enviado.",
                              label: "Cancelar campaña",
                              destructive: true,
                            })
                          }
                          onDelete={() =>
                            runAction(campaign, deleteCampaign, {
                              title: `¿Eliminar «${campaign.name}»?`,
                              description: "Es un borrador: no se ha enviado nada.",
                              label: "Eliminar",
                              destructive: true,
                            })
                          }
                          onEdit={() => router.push(`/marketing/campaigns/${campaign.id}`)}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              «Procesada» significa que todos los destinatarios se despacharon. La entrega se sigue
              confirmando después: las cifras del detalle se mueven un rato más.
            </p>
            {totalPages > 1 && (
              <BasicPagination totalPages={totalPages} page={page} onPageChange={setPage} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** De dónde sale la audiencia, sin entrar en el detalle de los filtros. */
function describeAudience(campaign: CampaignDTO): string {
  const content = campaign.template?.name
    ? `plantilla «${campaign.template.name}»`
    : campaign.hsm_channel_template_id
      ? "plantilla de Meta"
      : "sin contenido";
  const audience = campaign.segment_id
    ? "segmento guardado"
    : campaign.audience_filters
      ? "filtros a medida"
      : "todos los contactos";
  return `${audience} · ${content}`;
}

function CampaignMenu({
  campaign,
  onPause,
  onResume,
  onCancel,
  onDelete,
  onEdit,
}: {
  campaign: CampaignDTO;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const actions: Array<{ label: string; run: () => void; danger?: boolean }> = [];
  if (canPauseCampaign(campaign.status)) actions.push({ label: "Pausar", run: onPause });
  if (canResumeCampaign(campaign.status)) actions.push({ label: "Reanudar", run: onResume });
  if (canCancelCampaign(campaign.status)) {
    actions.push({ label: "Cancelar campaña", run: onCancel, danger: true });
  }
  if (canDeleteCampaign(campaign.status)) {
    actions.push({ label: "Eliminar borrador", run: onDelete, danger: true });
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button size="sm" variant="outline" onClick={onEdit}>
        Ver
      </Button>
      {actions.length > 0 && (
        <details className="relative">
          <summary
            className="inline-flex size-8 cursor-pointer list-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&::-webkit-details-marker]:hidden"
            aria-label={`Más acciones de ${campaign.name}`}
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </summary>
          <div className="glass absolute right-0 z-10 mt-1 w-48 overflow-hidden rounded-lg p-1">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.run}
                className={
                  action.danger
                    ? "w-full rounded-md px-2.5 py-1.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
                    : "w-full rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                }
              >
                {action.label}
              </button>
            ))}
          </div>
        </details>
      )}
    </div>
  );
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
