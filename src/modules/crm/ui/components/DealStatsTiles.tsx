"use client";

import { formatMoney } from "@/core/lib/format";
import type { DealStatsDTO } from "@/modules/crm/domain/deal";

/**
 * KPIs del pipeline (patrón OrderStatsTiles): forecast ponderado, abiertos,
 * ganados y win rate del período. Sin datos aún → esqueleto atenuado.
 */
function Tile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-background p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold tabular-nums">{value}</p>
      {detail !== undefined && (
        <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">{detail}</p>
      )}
    </div>
  );
}

export function DealStatsTiles({ stats }: { stats: DealStatsDTO | null }) {
  if (stats === null) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="status" aria-label="Cargando métricas">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        label="Forecast ponderado"
        value={formatMoney(stats.weighted_forecast_cents, stats.currency)}
        detail="valor × probabilidad de etapa"
      />
      <Tile
        label="Abiertas"
        value={String(stats.open_count)}
        detail={formatMoney(stats.open_value_cents, stats.currency)}
      />
      <Tile
        label="Ganadas"
        value={String(stats.won_count)}
        detail={formatMoney(stats.won_value_cents, stats.currency)}
      />
      <Tile
        label="Win rate"
        value={stats.win_rate_pct !== null ? `${stats.win_rate_pct}%` : "—"}
        detail={
          stats.avg_cycle_days !== null ? `ciclo medio ${stats.avg_cycle_days} días` : undefined
        }
      />
    </div>
  );
}
