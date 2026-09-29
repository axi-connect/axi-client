"use client";

import { META_DAILY_QUOTA_HINT, META_DAILY_QUOTA_LABEL, META_TEMPLATES_HREF } from "@/core/lib/hsm-copy";
import Link from "next/link";
import { Clock } from "lucide-react";
import { formatMillions } from "@/core/lib/format";
import { relativeTime } from "@/core/lib/relative-time";
import { cn } from "@/core/lib/utils";
import { BentoFigure, BentoLink, BentoTile, StatePill, type StatePillTone } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import type { AutomationDTO } from "@/modules/marketing/domain/automation";
import type { CampaignStatus } from "@/modules/marketing/domain/enums";
import { CAMPAIGN_STATUS_LABELS, TRIGGER_LABELS, TRIGGER_ORDER } from "@/modules/marketing/domain/enums";
import { campaignDispatched, campaignProgressPct } from "@/modules/marketing/domain/campaign-state";
import type { MetaStatus } from "@/modules/marketing/domain/next-up";
import {
  describePromotionKind,
  isPromotionLive,
  promotionCodes,
  redemptionProgressPct,
  type PromotionDTO,
} from "@/modules/marketing/domain/promotion";
import { skipReasonLabel } from "@/modules/marketing/domain/skip-reasons";
import type { ProspectingStatsDTO } from "@/modules/prospecting/public";
import type {
  LiveCampaign,
  RecoveryFeedEntry,
  RecoveryTotals,
  Section,
} from "@/modules/marketing/infrastructure/stores/overview.store";

/** Recargando con el dato anterior a la vista: la tarjeta se atenúa, no vuelve a la silueta. */
export const reloading = (section: Section<unknown>) => section.status === "loading" && section.data !== null;

const n = (value: number) => value.toLocaleString("es-CO");

/** Un bloque que no cargó: lo dice en su sitio y deja reintentar, sin tumbar el resto del Resumen. */
function TileError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-3 py-2">
      <p className="text-muted-foreground text-sm text-pretty">No pudimos leer {what}.</p>
      <Button size="sm" variant="outline" className="rounded-full" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

function TileSkeletonLines() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <span className="bg-muted h-9 w-32 animate-pulse rounded-lg" />
      <span className="bg-muted h-3 w-3/4 animate-pulse rounded" />
      <span className="bg-muted h-3 w-1/2 animate-pulse rounded" />
    </div>
  );
}

/* ───────────────────────── Recuperado por tus reglas ───────────────────────── */

export function RecoveredTile({
  recovery,
  automations,
  onRetry,
  className,
}: {
  recovery: Section<RecoveryTotals>;
  automations: Section<AutomationDTO[]>;
  onRetry: () => void;
  className?: string;
}) {
  const data = recovery.data;
  const rules = automations.data;
  const enabled = rules?.filter((rule) => rule.enabled).length ?? 0;
  const pill =
    rules && rules.length > 0 ? (
      <StatePill tone={enabled > 0 ? "success" : "neutral"}>
        {enabled} de {rules.length} {rules.length === 1 ? "regla encendida" : "reglas encendidas"}
      </StatePill>
    ) : undefined;

  if (!data) {
    return (
      <BentoTile label="Recuperado por tus reglas" aside={pill} className={className}>
        {recovery.status === "error" ? <TileError what="lo recuperado" onRetry={onRetry} /> : <TileSkeletonLines />}
      </BentoTile>
    );
  }

  const max = Math.max(1, ...TRIGGER_ORDER.map((trigger) => data.byTrigger[trigger].attributed_revenue_cents));
  const buyRate = data.sent > 0 ? ((data.converted / data.sent) * 100).toLocaleString("es-CO", { maximumFractionDigits: 1 }) : null;

  return (
    <BentoTile label="Recuperado por tus reglas" aside={pill} busy={reloading(recovery)} className={cn("@container gap-5", className)}>
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-heading text-[2.6rem] leading-none font-bold tracking-tight tabular-nums sm:text-5xl">
          {formatMillions(data.attributed_revenue_cents)}
        </span>
        <span className="text-muted-foreground text-[15px] whitespace-nowrap">
          en {n(data.converted)} {data.converted === 1 ? "pedido pagado" : "pedidos pagados"}
        </span>
      </p>

      <ul className="flex flex-col gap-3" aria-label="Recuperado por disparador">
        {TRIGGER_ORDER.map((trigger) => {
          const row = data.byTrigger[trigger];
          const width = (row.attributed_revenue_cents / max) * 100;
          return (
            <li
              key={trigger}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 @xl:grid-cols-[11rem_minmax(0,1fr)_8rem]"
            >
              <span className="truncate text-sm">{TRIGGER_LABELS[trigger]}</span>
              <span aria-hidden="true" className="bg-muted order-3 col-span-2 h-2 overflow-hidden rounded-full @xl:order-none @xl:col-span-1">
                <span className="bg-accent-amber block h-full rounded-full" style={{ width: `${String(width)}%` }} />
              </span>
              <span className="text-right text-sm whitespace-nowrap tabular-nums">
                <b className="font-semibold">{formatMillions(row.attributed_revenue_cents)}</b>
                <span className="text-muted-foreground"> · {n(row.converted)}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <dl className="border-border grid gap-4 border-t pt-4 @lg:grid-cols-3 @lg:gap-0 @lg:divide-x @lg:divide-border">
        <MiniStat label="Mensajes de recuperación" value={n(data.sent)} />
        <MiniStat label="Compraron después" value={buyRate === null ? "—" : `${buyRate} %`} unit={data.sent > 0 ? `${n(data.converted)} de ${n(data.sent)}` : undefined} />
        <MiniStat
          label="Cupones canjeados"
          value={n(data.coupons_redeemed)}
          unit={data.coupons_issued > 0 ? `de ${n(data.coupons_issued)} enviados` : undefined}
        />
      </dl>

      <p className="text-muted-foreground flex items-start gap-1.5 text-xs text-pretty">
        <Clock aria-hidden="true" className="mt-px size-3.5 shrink-0" />
        Pedidos pagados después del mensaje, dentro de la ventana de atribución · se cuentan una vez
        {data.omitted > 0 ? ` · sobre ${String(data.measured)} de tus reglas activas` : ""}
      </p>
    </BentoTile>
  );
}

function MiniStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 @lg:px-5 @lg:first:pl-0 @lg:last:pr-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="flex items-baseline gap-1.5 whitespace-nowrap">
        <span className="font-heading text-2xl leading-none font-bold tracking-tight tabular-nums">{value}</span>
        {unit ? <span className="text-muted-foreground truncate text-xs">{unit}</span> : null}
      </dd>
    </div>
  );
}

/* ───────────────────────────── Campañas en curso ───────────────────────────── */

const CAMPAIGN_TONE: Partial<Record<CampaignStatus, StatePillTone>> = { running: "success", paused: "warning" };

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-CO", { weekday: "long", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function LiveCampaignsTile({
  section,
  omitted,
  canManage,
  onRetry,
  className,
}: {
  section: Section<LiveCampaign[]>;
  omitted: number;
  canManage: boolean;
  onRetry: () => void;
  className?: string;
}) {
  const items = section.data;
  return (
    <BentoTile
      label="Campañas en curso"
      aside={<BentoLink href="/marketing/campaigns">Todas las campañas</BentoLink>}
      busy={reloading(section)}
      className={cn("@container", className)}
    >
      {items === null ? (
        section.status === "error" ? <TileError what="tus campañas" onRetry={onRetry} /> : <TileSkeletonLines />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-start gap-2 py-2">
          <p className="font-heading text-lg font-bold tracking-tight">No hay campañas en curso</p>
          <p className="text-muted-foreground text-sm text-pretty">Cuando lances una, aquí verás su avance en vivo.</p>
          {canManage ? <BentoLink href="/marketing/campaigns/new">Nueva campaña</BentoLink> : null}
        </div>
      ) : (
        <>
          <ul className="divide-border -my-1 divide-y">
            {items.map((item) => (
              <li key={item.campaign.id} className="py-4 first:pt-1 last:pb-1">
                <LiveCampaignRow item={item} />
              </li>
            ))}
          </ul>
          {omitted > 0 ? (
            <p className="text-muted-foreground text-xs">
              Y {omitted} más en curso ·{" "}
              <Link href="/marketing/campaigns" className="text-foreground inline-flex min-h-6 items-center font-medium underline-offset-4 hover:underline">
                verlas todas
              </Link>
            </p>
          ) : null}
        </>
      )}
    </BentoTile>
  );
}

function LiveCampaignRow({ item }: { item: LiveCampaign }) {
  const { campaign, stats } = item;
  const href = `/marketing/campaigns/${campaign.id}`;
  const title = (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5">
      <Link
        href={href}
        className="font-heading min-w-0 truncate py-0.5 text-[1.05rem] font-bold tracking-tight underline-offset-4 hover:underline"
        title={campaign.name}
      >
        {campaign.name}
      </Link>
      <StatePill tone={CAMPAIGN_TONE[campaign.status] ?? "neutral"}>{CAMPAIGN_STATUS_LABELS[campaign.status]}</StatePill>
    </span>
  );

  if (campaign.status === "scheduled") {
    const facts = [
      campaign.scheduled_at ? `Sale el ${formatWhen(campaign.scheduled_at)}` : "Sin fecha de salida",
      campaign.audience_total > 0 ? `${n(campaign.audience_total)} contactos` : null,
      campaign.template?.name ? `mensaje «${campaign.template.name}»` : null,
    ].filter(Boolean);
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          {title}
          <p className="text-muted-foreground text-sm text-pretty">{facts.join(" · ")}</p>
        </div>
        <Button size="sm" variant="outline" className="rounded-full" asChild>
          <Link href={href}>Ver</Link>
        </Button>
      </div>
    );
  }

  const pct = campaignProgressPct(stats);
  return (
    <div className="grid gap-4 @2xl:grid-cols-[minmax(0,1fr)_auto] @2xl:items-center @2xl:gap-8">
      <div className="flex min-w-0 flex-col gap-2">
        {title}
        <span
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Avance de ${campaign.name}`}
          className="bg-muted h-2 overflow-hidden rounded-full"
        >
          <span className="bg-brand-gradient block h-full rounded-full transition-[width] duration-500" style={{ width: `${String(pct)}%` }} />
        </span>
        <p className="text-muted-foreground text-xs tabular-nums">
          {stats
            ? `${n(campaignDispatched(stats))} de ${n(stats.audience_total)} procesados · ${String(pct)} %`
            : "Sus cifras no cargaron; ábrela para ver el detalle."}
        </p>
      </div>
      {stats ? (
        <dl className="grid grid-cols-3 gap-5 @2xl:gap-7">
          <MiniStat label="Respondieron" value={n(stats.replies)} />
          <MiniStat label="Compraron" value={n(stats.conversions)} />
          <MiniStat label="Recuperado" value={formatMillions(stats.revenue_cents)} />
        </dl>
      ) : null}
    </div>
  );
}

/* ───────────────────────────── Recuperación en vivo ───────────────────────────── */

export function RecoveryFeedTile({
  entries,
  connected,
  className,
}: {
  entries: RecoveryFeedEntry[];
  connected: boolean;
  className?: string;
}) {
  return (
    <BentoTile
      label="Recuperación en vivo"
      aside={
        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
          <span aria-hidden="true" className={cn("size-1.5 rounded-full", connected ? "bg-success" : "bg-muted-foreground")} />
          {connected ? "conectado" : "reconectando"}
        </span>
      }
      className={className}
    >
      {entries.length === 0 ? (
        <div className="flex flex-1 flex-col justify-center gap-1.5 py-2">
          <p className="font-heading text-lg font-bold tracking-tight">{connected ? "A la escucha" : "Sin conexión en tiempo real"}</p>
          <p className="text-muted-foreground text-sm text-pretty">
            {connected
              ? "Aquí verás cada decisión de tus reglas en cuanto ocurra: a quién le escribieron y a quién no."
              : "Se reintenta sola. Mientras tanto, las cifras de esta pantalla siguen siendo correctas."}
          </p>
        </div>
      ) : (
        <ul className="divide-border divide-y" aria-live="polite">
          {entries.map((entry) => {
            const sent = entry.status === "sent";
            return (
              <li key={entry.execution_id} className="flex gap-3 py-3 first:pt-1">
                <span aria-hidden="true" className={cn("mt-1.5 size-2 shrink-0 rounded-full", sent ? "bg-accent-amber" : "bg-muted-foreground/50")} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm text-pretty">
                    <b className="font-semibold">{sent ? "Mensaje enviado" : "No se envió"}</b>
                    {sent ? null : <span className="text-muted-foreground"> · {skipReasonLabel(entry.skip_reason)}</span>}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {TRIGGER_LABELS[entry.trigger_type]} · {relativeTime(entry.received_at)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </BentoTile>
  );
}

/* ───────────────────────────────── Promociones ───────────────────────────────── */

export function PromotionsTile({
  section,
  now,
  onRetry,
  className,
}: {
  section: Section<PromotionDTO[]>;
  now: Date;
  onRetry: () => void;
  className?: string;
}) {
  const live = section.data?.filter((promotion) => isPromotionLive(promotion, now)) ?? null;
  return (
    <BentoTile
      label="Promociones"
      aside={<BentoLink href="/marketing/promotions">Ver todas</BentoLink>}
      busy={reloading(section)}
      className={className}
    >
      {live === null ? (
        section.status === "error" ? <TileError what="tus promociones" onRetry={onRetry} /> : <TileSkeletonLines />
      ) : (
        <>
          <BentoFigure value={n(live.length)} unit={live.length === 1 ? "activa" : "activas"} />
          {live.length === 0 ? (
            <p className="text-muted-foreground text-sm text-pretty">Ninguna está dando algo ahora mismo.</p>
          ) : (
            <ul className="divide-border divide-y">
              {live.slice(0, 2).map((promotion) => {
                const pct = redemptionProgressPct(promotion);
                const code = promotionCodes(promotion)[0];
                return (
                  <li key={promotion.id} className="flex flex-col gap-2 py-3 last:pb-0">
                    <span className="flex min-w-0 items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        {code ? <span className="bg-muted shrink-0 rounded-md px-1.5 py-0.5 font-mono text-xs">{code}</span> : null}
                        <span className="text-muted-foreground truncate" title={describePromotionKind(promotion)}>
                          {describePromotionKind(promotion)}
                        </span>
                      </span>
                      <span className="shrink-0 whitespace-nowrap tabular-nums">
                        <b className="font-semibold">{n(promotion.redemptions_count)}</b>
                        {promotion.max_redemptions_total !== null ? (
                          <span className="text-muted-foreground"> de {n(promotion.max_redemptions_total)}</span>
                        ) : null}
                      </span>
                    </span>
                    {pct !== null ? (
                      <span aria-hidden="true" className="bg-muted h-1.5 overflow-hidden rounded-full">
                        <span className="bg-accent-amber block h-full rounded-full" style={{ width: `${String(pct)}%` }} />
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </BentoTile>
  );
}

/* ─────────────────────────────────── Bajas ─────────────────────────────────── */

export function OptOutsTile({
  section,
  onRetry,
  className,
}: {
  section: Section<number>;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <BentoTile
      label="Personas que pidieron no recibir"
      aside={<BentoLink href="/marketing/settings/opt-outs">Ver bajas</BentoLink>}
      busy={reloading(section)}
      className={className}
    >
      {section.data === null ? (
        section.status === "error" ? <TileError what="las bajas" onRetry={onRetry} /> : <TileSkeletonLines />
      ) : (
        <>
          <BentoFigure value={n(section.data)} unit={section.data === 1 ? "baja activa" : "bajas activas"} />
          <p className="text-muted-foreground text-sm text-pretty">
            Nadie en esta lista recibe campañas ni recuperación. Se suman solas cuando alguien escribe «no más» o «baja».
          </p>
        </>
      )}
    </BentoTile>
  );
}

/* ───────────────────────── Plantillas de Meta y cupo ───────────────────────── */

function NoCloudNumber() {
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-2 py-1">
      <p className="text-muted-foreground text-sm text-pretty">Se ve al conectar un número de WhatsApp Cloud.</p>
      <BentoLink href="/settings/channels">Conectar WhatsApp</BentoLink>
    </div>
  );
}

export function MetaTemplatesTile({
  section,
  onRetry,
  className,
}: {
  section: Section<MetaStatus | null>;
  onRetry: () => void;
  className?: string;
}) {
  const meta = section.data;
  return (
    <BentoTile
      label="Plantillas de Meta"
      aside={meta ? <BentoLink href={META_TEMPLATES_HREF}>Plantillas</BentoLink> : undefined}
      busy={reloading(section)}
      className={className}
    >
      {section.status !== "ready" && meta === null ? (
        section.status === "error" ? <TileError what="tus plantillas" onRetry={onRetry} /> : <TileSkeletonLines />
      ) : meta === null ? (
        <NoCloudNumber />
      ) : (
        <>
          <BentoFigure value={n(meta.approved)} unit={meta.approved === 1 ? "aprobada" : "aprobadas"} />
          {meta.pending + meta.rejected > 0 ? (
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {meta.pending > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="bg-warning size-1.5 rounded-full" />
                  {meta.pending} en revisión
                </span>
              ) : null}
              {meta.rejected > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="bg-destructive size-1.5 rounded-full" />
                  {meta.rejected} {meta.rejected === 1 ? "rechazada" : "rechazadas"}
                </span>
              ) : null}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">Ninguna en revisión ni rechazada.</p>
          )}
        </>
      )}
    </BentoTile>
  );
}

export function QuotaTile({
  section,
  onRetry,
  className,
}: {
  section: Section<MetaStatus | null>;
  onRetry: () => void;
  className?: string;
}) {
  const meta = section.data;
  const window = meta?.window ?? null;
  return (
    <BentoTile
      label={META_DAILY_QUOTA_LABEL}
      aside={meta ? <span className="text-muted-foreground text-xs">{META_DAILY_QUOTA_HINT}</span> : undefined}
      busy={reloading(section)}
      className={className}
    >
      {section.status !== "ready" && meta === null ? (
        section.status === "error" ? <TileError what="tu cupo de Meta" onRetry={onRetry} /> : <TileSkeletonLines />
      ) : meta === null ? (
        <NoCloudNumber />
      ) : window === null ? (
        <p className="text-muted-foreground text-sm text-pretty">Meta no respondió con tu cupo; se vuelve a pedir al recargar.</p>
      ) : window.limit === null ? (
        <>
          <BentoFigure value="Sin tope" size="md" />
          <p className="text-muted-foreground text-sm text-pretty">Meta no le ha puesto un límite diario a tu número.</p>
        </>
      ) : (
        <>
          <BentoFigure
            value={n(window.remaining ?? window.limit)}
            unit={(window.remaining ?? window.limit) === 1 ? "conversación más" : "conversaciones más"}
          />
          <span aria-hidden="true" className="bg-muted h-2 overflow-hidden rounded-full">
            <span
              className="bg-foreground block h-full rounded-full"
              style={{ width: `${String(Math.min(100, (window.used / Math.max(1, window.limit)) * 100))}%` }}
            />
          </span>
          <p className="text-muted-foreground text-sm text-pretty">
            Usadas {n(window.used)} de las {n(window.limit)} que Meta te deja iniciar al día.
          </p>
        </>
      )}
    </BentoTile>
  );
}

/* ─────────────────────────── Captación de leads ─────────────────────────── */

/** El embudo de captación: descubiertos → calificados → en el CRM, cada barra sobre los descubiertos. */
export function CaptureTile({
  section,
  onRetry,
  className,
}: {
  section: Section<ProspectingStatsDTO>;
  onRetry: () => void;
  className?: string;
}) {
  const stats = section.data;
  return (
    <BentoTile
      label="Captación de leads"
      aside={<BentoLink href="/marketing/leads">Bandeja</BentoLink>}
      busy={reloading(section)}
      className={className}
    >
      {stats === null ? (
        section.status === "error" ? <TileError what="tu captación" onRetry={onRetry} /> : <TileSkeletonLines />
      ) : (
        <>
          <ul className="flex flex-col gap-3.5">
            {(
              [
                ["Descubiertos", stats.discovered, "bg-muted-foreground/40"],
                ["Calificados", stats.qualified, "bg-accent-violet"],
                ["En el CRM", stats.promoted, "bg-brand-gradient"],
              ] as const
            ).map(([label, value, bar]) => (
              <li key={label} className="flex flex-col gap-1.5">
                <span className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{label}</span>
                  <b className="font-semibold tabular-nums">{n(value)}</b>
                </span>
                <span aria-hidden="true" className="bg-muted h-1.5 overflow-hidden rounded-full">
                  <span
                    className={cn("block h-full rounded-full", bar)}
                    style={{ width: `${String(stats.discovered > 0 ? Math.min(100, (value / stats.discovered) * 100) : 0)}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground mt-auto text-xs text-pretty">Buscar datos de un lead no gasta unidades de tu plan.</p>
        </>
      )}
    </BentoTile>
  );
}
