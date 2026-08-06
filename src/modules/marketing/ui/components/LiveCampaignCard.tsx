"use client";

import Link from "next/link";
import { formatMoney } from "@/core/lib/format";
import { StatusBadge } from "@/shared/components/features/status-badge";
import {
  CAMPAIGN_STATUS_MAP,
  campaignDispatched,
  campaignProgressPct,
} from "@/modules/marketing/domain/campaign-state";
import type { LiveCampaign } from "@/modules/marketing/infrastructure/stores/overview.store";

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
 * Fila de campaña en curso del resumen. La barra mide DESPACHADO sobre
 * audiencia (omitidos incluidos: también están resueltos), no entregado — la
 * entrega se confirma minutos después y una barra que retrocede confunde.
 *
 * Una campaña PROGRAMADA no ha empezado: pintarle una barra al 0% y "$ 0" la
 * hace parecer fallida. En ese estado lo único que importa es cuándo sale.
 */
export function LiveCampaignCard({ item }: { item: LiveCampaign }) {
  const { campaign, stats } = item;
  const pct = campaignProgressPct(stats);
  const dispatched = campaignDispatched(stats);

  if (campaign.status === "scheduled") {
    return (
      <Link
        href={`/marketing/campaigns/${campaign.id}`}
        className="block px-5 py-4 transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{campaign.name}</span>
          <StatusBadge status={campaign.status} map={CAMPAIGN_STATUS_MAP} />
        </div>
        <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">
          {campaign.scheduled_at
            ? `Sale el ${formatScheduledAt(campaign.scheduled_at)}`
            : "Sin fecha de salida"}
          {campaign.audience_total > 0 &&
            ` · ${campaign.audience_total.toLocaleString("es-CO")} contactos`}
        </p>
      </Link>
    );
  }

  return (
    <Link
      href={`/marketing/campaigns/${campaign.id}`}
      className="block px-5 py-4 transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{campaign.name}</span>
        <StatusBadge status={campaign.status} map={CAMPAIGN_STATUS_MAP} />
        <span className="flex-1" />
        {stats && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {dispatched.toLocaleString("es-CO")} / {stats.audience_total.toLocaleString("es-CO")}
          </span>
        )}
      </div>

      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progreso de ${campaign.name}`}
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>

      {stats ? (
        <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">
          {stats.replies.toLocaleString("es-CO")} respondieron ·{" "}
          {stats.conversions.toLocaleString("es-CO")} compraron ·{" "}
          <span className="font-medium text-accent-amber">
            {formatMoney(stats.revenue_cents)}
          </span>
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Sus cifras no cargaron; ábrela para ver el detalle.
        </p>
      )}
    </Link>
  );
}
