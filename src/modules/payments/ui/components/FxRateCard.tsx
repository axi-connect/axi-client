"use client";

import { Info, RefreshCw, TriangleAlert } from "lucide-react";

import { formatMoney, formatShortDate } from "@/core/lib/format";
import { BentoFigure, StatePill } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import {
  formatRate,
  FX_SAMPLE_CENTS,
  FX_SOURCE_LABELS,
  fxNotice,
  sampleQuoteCents,
  spreadToPercent,
  type LatestFxRateDTO,
} from "@/modules/payments/domain/fx-settings";

const TILE = "flex min-w-0 flex-col gap-3 rounded-3xl border border-border bg-card p-5";

/** Una nota que dura mientras dure su causa (§9.4): el color va en el icono. */
function TileNote({ tone, children }: { tone: "warning" | "info"; children: React.ReactNode }) {
  const Icon = tone === "warning" ? TriangleAlert : Info;
  return (
    <p className="grid grid-cols-[18px_1fr] gap-2 text-[13px] leading-relaxed text-foreground/80">
      <Icon aria-hidden="true" className={tone === "warning" ? "mt-0.5 size-4 text-warning" : "mt-0.5 size-4 text-info"} />
      <span>{children}</span>
    </p>
  );
}

/**
 * La TRM del día y la tasa del tenant como dos fichas del bento (Cobros
 * premium P2): la oficial con su fuente y vigencia, y la efectiva con el
 * ejemplo de un importe real — el número suelto no dice si el ajuste está bien
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
  const sample = sampleQuoteCents(latest);

  return (
    <>
      <section className={TILE} aria-labelledby="fx-rate-title">
        <header className="flex min-h-6 items-center justify-between gap-2">
          <h2 id="fx-rate-title" className="font-sans text-xs font-normal text-muted-foreground">
            TRM de hoy
          </h2>
          <span className="flex items-center gap-1">
            {official === null ? (
              <StatePill tone="neutral">Esperando la de hoy</StatePill>
            ) : notice === "stale" ? (
              <StatePill tone="warning">Sin actualizar desde {formatShortDate(official.valid_from)}</StatePill>
            ) : (
              <StatePill tone="success">Vigente {formatShortDate(official.valid_from)}</StatePill>
            )}
            {onRefresh ? (
              <Button type="button" variant="ghost" size="icon" aria-label="Actualizar" onClick={onRefresh} disabled={refreshing}>
                <RefreshCw aria-hidden="true" className={refreshing ? "motion-safe:animate-spin" : ""} />
              </Button>
            ) : null}
          </span>
        </header>
        {official === null ? (
          <>
            <p className="font-heading text-2xl leading-tight font-bold tracking-tight">Aún no hay TRM publicada.</p>
            <TileNote tone="info">
              La serie se carga sola a las 18:30 (hora Bogotá). Mientras tanto puedes fijar una tasa manual con vigencia.
            </TileNote>
          </>
        ) : (
          <>
            <BentoFigure value={`$ ${formatRate(official.rate)}`} />
            <p className="text-[13px] text-foreground/80">
              Dólar → peso · {FX_SOURCE_LABELS[official.source] ?? official.source}
            </p>
            {notice === "stale" ? (
              <TileNote tone="warning">
                La fuente oficial no publicó los últimos días; se usa la última TRM conocida. Si necesitas otra, fija una
                tasa manual.
              </TileNote>
            ) : null}
          </>
        )}
      </section>

      <section className={TILE} aria-labelledby="fx-effective-title">
        <header className="flex min-h-6 items-center justify-between gap-2">
          <h2 id="fx-effective-title" className="font-sans text-xs font-normal text-muted-foreground">
            Tu tasa
          </h2>
          {effective !== null ? (
            <StatePill tone="neutral">
              {effective.source === "tenant_override"
                ? "Tu tasa manual"
                : `TRM + ${spreadToPercent(effective.spread_bps)} %`}
            </StatePill>
          ) : null}
        </header>
        {effective === null ? (
          <p className="text-sm text-muted-foreground">Sin tasa: fija una manual o espera la TRM de hoy.</p>
        ) : (
          <>
            <BentoFigure value={`$ ${formatRate(effective.rate)}`} />
            {sample !== null ? (
              <p className="text-[13px] text-pretty text-foreground/80">
                Un paquete de <strong className="font-medium tabular-nums">{formatMoney(FX_SAMPLE_CENTS, "USD")}</strong> se
                cotiza hoy en <strong className="font-semibold whitespace-nowrap tabular-nums">≈ {formatMoney(sample, "COP")}</strong>
              </p>
            ) : null}
            {notice === "manual" ? (
              <TileNote tone="info">
                Mientras tu tasa manual esté vigente, manda sobre la oficial y el ajuste. Al vencer vuelve la TRM del día.
              </TileNote>
            ) : null}
          </>
        )}
      </section>
    </>
  );
}
