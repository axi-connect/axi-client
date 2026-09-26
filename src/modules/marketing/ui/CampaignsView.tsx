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
import { MarketingHeader } from "@/modules/marketing/ui/components/MarketingHeader";
import { LoadError, TableCard, TD, TH } from "@/modules/marketing/ui/components/premium";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import BasicPagination from "@/shared/components/ui/pagination";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import type { CampaignDTO } from "@/modules/marketing/domain/campaign";
import { campaignEditHref, toDuplicateCampaignDTO } from "@/modules/marketing/domain/campaign-draft";
import {
  campaignAudienceLabel,
  CAMPAIGN_STATUS_MAP,
  canCancelCampaign,
  canDeleteCampaign,
  canEditCampaign,
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
  createCampaign,
  deleteCampaign,
  listCampaigns,
  pauseCampaign,
  resumeCampaign,
} from "@/modules/marketing/infrastructure/services/campaigns-service.adapter";

const PAGE_SIZE = 20;
const ALL = "__all__";

/** "8 ago, 9:00 a. m." */
function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  // Otro año, sin hora: «28 nov 2025» se lee de un vistazo; la hora de hace un año no le importa a nadie.
  if (date.getFullYear() !== new Date().getFullYear()) {
    return date.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
  }
  return date.toLocaleString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

/** La fecha que importa según el estado: cuándo sale, cuándo salió o cuándo se creó. */
export function campaignWhen(campaign: CampaignDTO): string {
  switch (campaign.status) {
    case "scheduled":
      return campaign.scheduled_at ? `Sale el ${formatWhen(campaign.scheduled_at)}` : "Programada";
    case "running":
    case "paused":
    case "completed":
      return campaign.launched_at ? `Lanzada el ${formatWhen(campaign.launched_at)}` : "Lanzada";
    case "cancelled":
      return campaign.cancelled_at ? `Cancelada el ${formatShortDate(campaign.cancelled_at)}` : "Cancelada";
    case "draft":
      return `Creada el ${formatShortDate(campaign.created_at)}`;
  }
}

/** La misma fecha en dos piezas, para la columna «Cuándo»: qué pasó (tenue) y la fecha, corta. */
function campaignWhenParts(campaign: CampaignDTO): { verb: string; date: string | null } {
  const at =
    campaign.status === "scheduled"
      ? campaign.scheduled_at
      : campaign.status === "cancelled"
        ? campaign.cancelled_at
        : campaign.status === "draft"
          ? campaign.created_at
          : campaign.launched_at;
  const verb = { scheduled: "Sale", running: "Lanzada", paused: "Lanzada", completed: "Lanzada", cancelled: "Cancelada", draft: "Creada" }[
    campaign.status
  ];
  return { verb, date: at ? formatWhen(at) || null : null };
}

/**
 * Listado de campañas.
 *
 * NO muestra stats: el endpoint de lista no las trae y pedirlas por fila sería
 * una petición por campaña. El funnel vive en el detalle, que es donde se mira.
 * Las acciones se derivan de predicados puros del dominio, no de un `try/catch`
 * contra el backend — un botón que solo falla al pulsarlo es un botón que miente.
 *
 * Un borrador se RETOMA («Continuar») y cualquier campaña se DUPLICA como punto
 * de partida (canvas 2026-09-26). La tabla es una tarjeta `@container`: las
 * columnas aparecen según su ancho y, estrecha, el estado y la fecha suben a la
 * primera columna. El menú de fila va con `portal`: dentro del scroller de la
 * tabla quedaría recortado.
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
                });
              }
            })();
          },
        },
      ],
    });
  }

  /** Duplicar: nace un borrador con la misma audiencia y el mismo mensaje, y se abre en el asistente. */
  async function duplicate(campaign: CampaignDTO) {
    try {
      const copy = await createCampaign(toDuplicateCampaignDTO(campaign));
      showAlert({ tone: "success", title: "Campaña duplicada", description: "Quedó como borrador: revísala antes de lanzarla." });
      router.push(campaignEditHref(copy.id));
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo duplicar la campaña") });
    }
  }

  const handlers = (campaign: CampaignDTO): RowHandlers => ({
    onPause: () =>
      runAction(campaign, pauseCampaign, {
        title: `¿Pausar «${campaign.name}»?`,
        description:
          "Deja de enviar. Los mensajes ya despachados no se pueden recuperar, pero no saldrá ninguno más hasta que la reanudes.",
        label: "Pausar",
      }),
    onResume: () =>
      runAction(campaign, resumeCampaign, {
        title: `¿Reanudar «${campaign.name}»?`,
        description: "Se vuelven a encolar los destinatarios que quedaron pendientes.",
        label: "Reanudar",
      }),
    onCancel: () =>
      runAction(campaign, cancelCampaign, {
        title: `¿Cancelar «${campaign.name}»?`,
        description:
          "Los destinatarios pendientes quedan descartados y no se puede deshacer. Lo ya enviado sigue enviado.",
        label: "Cancelar campaña",
        destructive: true,
      }),
    onDelete: () =>
      runAction(campaign, deleteCampaign, {
        title: `¿Eliminar «${campaign.name}»?`,
        description: "Es un borrador: no se ha enviado nada.",
        label: "Eliminar",
        destructive: true,
      }),
    onDuplicate: () => void duplicate(campaign),
  });

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <MarketingHeader
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
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <SegmentedControl
            value={status}
            onValueChange={(next) => {
              setStatus(next);
              // Un filtro nuevo empieza en la página 1: el hook no lo hace solo.
              setPage(1);
            }}
            label="Filtrar por estado"
            size="sm"
            items={[
              { value: ALL, label: "Todas" },
              ...CAMPAIGN_STATUS_ORDER.map((s) => ({ value: s, label: CAMPAIGN_STATUS_LABELS[s] })),
            ]}
          />
          <span className="text-muted-foreground text-xs tabular-nums">
            {total.toLocaleString("es-CO")} {total === 1 ? "campaña" : "campañas"}
          </span>
        </div>
      )}

      {loading && items.length === 0 ? (
        <TableSkeleton rows={5} />
      ) : error ? (
        <LoadError message={errorMessage(error, "No pudimos cargar tus campañas")} onRetry={refresh} />
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
        <TableCard>
          <Table>
            <caption className="sr-only">Listado de campañas</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={TH}>Campaña</TableHead>
                <TableHead className={`${TH} hidden @2xl:table-cell`}>Estado</TableHead>
                <TableHead className={`${TH} hidden text-right @5xl:table-cell`}>Audiencia</TableHead>
                <TableHead className={`${TH} hidden @4xl:table-cell`}>Cuándo</TableHead>
                <TableHead className={`${TH} hidden @md:table-cell`}>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className={`${TD} whitespace-normal`}>
                    <Link
                      href={`/marketing/campaigns/${campaign.id}`}
                      className="block max-w-[calc(100cqw-2.5rem)] truncate py-0.5 font-medium @md:max-w-[16rem] @4xl:max-w-[20rem] underline-offset-4 hover:underline"
                      title={campaign.name}
                    >
                      {campaign.name}
                    </Link>
                    <span className="text-muted-foreground block max-w-[calc(100cqw-2.5rem)] text-xs text-pretty @md:max-w-[16rem] @4xl:max-w-[20rem]">
                      {describeAudience(campaign)}
                    </span>
                    {/* Con la tabla estrecha, el estado y la fecha suben aquí. */}
                    <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs @4xl:hidden">
                      <span className="@2xl:hidden">
                        <StatusBadge status={campaign.status} map={CAMPAIGN_STATUS_MAP} appearance="dot" />
                      </span>
                      <span className="text-muted-foreground whitespace-nowrap">{campaignWhen(campaign)}</span>
                    </span>
                    {canManage && (
                      <div className="mt-2 @md:hidden">
                        <RowActions campaign={campaign} {...handlers(campaign)} />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className={`${TD} hidden @2xl:table-cell`}>
                    <StatusBadge status={campaign.status} map={CAMPAIGN_STATUS_MAP} appearance="dot" />
                  </TableCell>
                  <TableCell className={`${TD} hidden text-right tabular-nums @5xl:table-cell`}>
                    {campaignAudienceLabel(campaign) ?? <span className="text-muted-foreground">al lanzar</span>}
                  </TableCell>
                  <TableCell className={`${TD} hidden @4xl:table-cell`}>
                    <WhenCell campaign={campaign} />
                  </TableCell>
                  <TableCell className={`${TD} hidden text-right @md:table-cell`}>
                    {canManage ? (
                      <RowActions campaign={campaign} {...handlers(campaign)} />
                    ) : (
                      <Button size="sm" variant="outline" className="rounded-full" asChild>
                        <Link href={`/marketing/campaigns/${campaign.id}`}>Ver</Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
            <p className="text-muted-foreground text-xs text-pretty">
              «Procesada» significa que todos los destinatarios se despacharon; la entrega se sigue confirmando un
              rato después.
            </p>
            {totalPages > 1 && <BasicPagination totalPages={totalPages} page={page} onPageChange={setPage} />}
          </div>
        </TableCard>
      )}
    </div>
  );
}

function WhenCell({ campaign }: { campaign: CampaignDTO }) {
  const { verb, date } = campaignWhenParts(campaign);
  return (
    <span className="flex flex-col whitespace-nowrap">
      <span className="text-muted-foreground text-xs">{verb}</span>
      <span className="text-sm tabular-nums">{date ?? "—"}</span>
    </span>
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

type RowHandlers = {
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
};

/**
 * La acción principal de la fila (la que cambia con el estado) y el menú con el
 * resto. Un borrador se CONTINÚA; una programada se puede editar; el resto se
 * ve. El menú va con `portal`: la tabla scrollea y en su sitio se recortaría.
 */
function RowActions({ campaign, onPause, onResume, onCancel, onDelete, onDuplicate }: { campaign: CampaignDTO } & RowHandlers) {
  const draft = campaign.status === "draft";
  const primary = draft
    ? { label: "Continuar", href: campaignEditHref(campaign.id), variant: "contrast" as const }
    : { label: "Ver", href: `/marketing/campaigns/${campaign.id}`, variant: "outline" as const };

  const flow: Array<{ label: string; run: () => void }> = [];
  if (!draft && canEditCampaign(campaign.status)) flow.push({ label: "Editar", run: () => undefined });
  if (canPauseCampaign(campaign.status)) flow.push({ label: "Pausar", run: onPause });
  if (canResumeCampaign(campaign.status)) flow.push({ label: "Reanudar", run: onResume });
  const danger: Array<{ label: string; run: () => void }> = [];
  if (canCancelCampaign(campaign.status)) danger.push({ label: "Cancelar campaña", run: onCancel });
  if (canDeleteCampaign(campaign.status)) danger.push({ label: "Eliminar borrador", run: onDelete });

  return (
    <div className="flex items-center gap-1 @md:justify-end">
      <Button size="sm" variant={primary.variant} className="rounded-full" asChild>
        <Link href={primary.href}>{primary.label}</Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Más acciones de ${campaign.name}`}
            className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-ring inline-flex size-9 items-center justify-center rounded-full transition-colors focus-visible:outline-2"
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent portal align="end" className="w-52">
          {flow.map((action) =>
            action.label === "Editar" ? (
              <Link
                key="edit"
                role="menuitem"
                href={campaignEditHref(campaign.id)}
                className="hover:bg-accent focus:bg-accent block w-full rounded-sm px-3 py-2 text-left text-sm outline-none"
              >
                Editar
              </Link>
            ) : (
              <DropdownMenuItem key={action.label} onClick={action.run}>
                {action.label}
              </DropdownMenuItem>
            ),
          )}
          <DropdownMenuItem onClick={onDuplicate}>Duplicar</DropdownMenuItem>
          {danger.length > 0 && <DropdownMenuSeparator />}
          {danger.map((action) => (
            <DropdownMenuItem key={action.label} className="text-destructive" onClick={action.run}>
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
