"use client";

import { ArrowRightLeft, Info, RefreshCw, TriangleAlert } from "lucide-react";

import { formatMoney, formatShortDate } from "@/core/lib/format";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { StatusDotBadge } from "@/shared/components/ui/status-badges";
import {
  FX_SOURCE_LABELS,
  formatRate,
  fxNotice,
  spreadToPercent,
  type LatestFxRateDTO,
} from "@/modules/payments/domain/fx-settings";

/** Importe de ejemplo: un paquete de US$ 3.500 en centavos. */
const SAMPLE_CENTS = 350_000;

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-border/50 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

/**
 * La TRM del día con su fuente y vigencia, la tasa efectiva del tenant y un
 * ejemplo con un importe real: el número suelto no dice si el ajuste está bien
 * puesto, el equivalente de un paquete sí.
 */
export function FxRateCard({
  latest,
  onRefresh,
  refreshing,
}: {
  latest: LatestFxRateDTO;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const notice = fxNotice(latest);
  const { official, effective } = latest;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6" aria-labelledby="fx-rate-title">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="fx-rate-title" className="flex items-center gap-2 text-lg font-medium">
            <ArrowRightLeft aria-hidden="true" className="size-[18px]" />
            TRM de hoy
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Dólar → peso, fuente oficial (Superfinanciera).</p>
        </div>
        {onRefresh ? (
          <Button type="button" variant="ghost" size="icon" aria-label="Actualizar" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw aria-hidden="true" className={refreshing ? "animate-spin" : ""} />
          </Button>
        ) : null}
      </div>

      {official === null ? (
        <div className="grid grid-cols-[20px_1fr] gap-2.5 rounded-xl border border-border bg-secondary p-3 text-sm">
          <Info aria-hidden="true" className="mt-0.5 size-[18px] text-info" />
          <p>
            <strong className="font-medium">Aún no hay TRM publicada.</strong> La serie se carga sola a las 18:30 (hora
            Bogotá). Mientras tanto puedes fijar una tasa manual con vigencia.
          </p>
        </div>
      ) : (
        <>
          <p className="font-heading text-[40px] leading-none tracking-tight tabular-nums">$ {formatRate(official.rate)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            <Badge variant="outline">{FX_SOURCE_LABELS[official.source] ?? official.source}</Badge>
            {notice === "stale" ? (
              <StatusDotBadge tone="warning">Sin actualizar desde {formatShortDate(official.valid_from)}</StatusDotBadge>
            ) : (
              <StatusDotBadge tone="ok">Vigente {formatShortDate(official.valid_from)}</StatusDotBadge>
            )}
          </div>

          <div className="mt-3.5">
            {effective !== null && effective.source === "tenant_override" ? (
              <Line label="Tu tasa manual" value={`$ ${formatRate(effective.rate)}`} />
            ) : (
              <Line label="Tu ajuste" value={`+${spreadToPercent(effective?.spread_bps ?? 0)} %`} />
            )}
            <Line
              label="Tu tasa efectiva"
              value={effective === null ? "sin tasa" : `$ ${formatRate(effective.rate)}`}
            />
          </div>

          {effective !== null ? (
            <p className="mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary px-3.5 py-3 text-sm">
              <span>
                Un paquete de <strong className="font-medium tabular-nums">{formatMoney(SAMPLE_CENTS, "USD")}</strong> se
                cotiza hoy en
              </span>
              <strong className="font-medium tabular-nums">
                ≈ {formatMoney(Math.round(SAMPLE_CENTS * effective.rate), "COP")}
              </strong>
            </p>
          ) : null}
        </>
      )}

      {notice === "stale" ? (
        <div className="mt-3 grid grid-cols-[20px_1fr] gap-2.5 rounded-xl border border-dashed border-border p-3 text-sm">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-[18px] text-warning" />
          <p>
            La fuente oficial no publicó los últimos días; se usa la última TRM conocida. Si necesitas otra, fija una
            tasa manual.
          </p>
        </div>
      ) : null}
      {notice === "manual" ? (
        <div className="mt-3 grid grid-cols-[20px_1fr] gap-2.5 rounded-xl border border-dashed border-border p-3 text-sm">
          <Info aria-hidden="true" className="mt-0.5 size-[18px] text-info" />
          <p>
            Mientras tu tasa manual esté vigente, manda sobre la oficial y el ajuste. Al vencer vuelve la TRM del día.
          </p>
        </div>
      ) : null}
    </section>
  );
}
