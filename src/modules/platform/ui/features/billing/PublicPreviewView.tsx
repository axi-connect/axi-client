"use client";

/**
 * Vista pública (`/platform/billing/public`): lo que devuelve
 * `GET /public/pricing` a una fecha, tal como lo consumirá la landing. Sirve
 * para ver una vigencia programada ANTES de que rija y para comprobar que la
 * promoción y su contador salen como deben.
 */
import { useMemo, useState } from "react";
import { formatMoney, formatShortDate } from "@/core/lib/format";
import { TableSkeleton } from "@/shared/components/features/loading";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import type { PublicPricing } from "../../../domain/billing";
import { discountedCents } from "../../../domain/pricing-cells";
import { usePricingPreviewQuery } from "../../../infrastructure/api/hooks/use-catalog";
import { ProblemAlert } from "../../components/ProblemAlert";

export function PublicPreviewView() {
  const [date, setDate] = useState("");
  const at = date === "" ? undefined : new Date(`${date}T12:00:00Z`).toISOString();
  const preview = usePricingPreviewQuery(at);
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-brand text-[10.5px] font-semibold tracking-[0.12em] uppercase">Lo que ve el visitante</p>
          <h1 className="text-3xl font-semibold tracking-tight">Vista pública</h1>
          <p className="text-muted-foreground max-w-[70ch] text-sm">
            Lo que devuelve el catálogo público a una fecha: solo celdas vigentes y activas, planes vendibles
            y la promoción abierta con su contador. Nunca costos ni márgenes.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="preview-date">Ver a la fecha</Label>
            <Input id="preview-date" type="date" className="mt-1.5 w-[170px] tabular-nums" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <SegmentedControl
            label="Periodicidad"
            value={interval}
            onValueChange={setInterval}
            items={[
              { value: "monthly", label: "Mensual" },
              { value: "annual", label: "Anual" },
            ]}
          />
        </div>
      </header>

      {preview.isPending ? (
        <TableSkeleton rows={4} />
      ) : preview.isError ? (
        <ProblemAlert error={preview.error} onRetry={() => void preview.refetch()} />
      ) : (
        <PreviewBody catalog={preview.data} interval={interval} />
      )}
    </div>
  );
}

function PreviewBody({ catalog, interval }: { catalog: PublicPricing; interval: "monthly" | "annual" }) {
  const cells = useMemo(
    () => catalog.prices.filter((price) => price.tier !== null && price.interval === interval),
    [catalog.prices, interval],
  );
  const legacy = catalog.prices.filter((price) => price.tier === null && price.interval === "monthly");
  const promo = catalog.promotion;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <section className="border-border-soft bg-card rounded-2xl border p-4 shadow-[var(--shadow-float)]">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold">Así lo pinta la landing</h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Vigencia resuelta al {formatShortDate(catalog.as_of)} · versión <span className="font-mono">{catalog.version}</span>
            </p>
          </div>
          <Badge variant="outline" className="text-muted-foreground font-mono text-[10.5px]">
            Cache-Control 60 s · ETag
          </Badge>
        </header>

        {cells.length === 0 ? (
          <p className="text-muted-foreground border-border mt-4 rounded-xl border border-dashed p-4 text-sm">
            A esta fecha no rige ninguna celda de dos ejes. La landing mostraría el catálogo de un eje
            {legacy.length > 0 ? ` (${legacy.length} filas legado)` : ""} o el estado «precios a consulta».
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-border-soft border-b text-[11px] tracking-wide uppercase">
                  <th className="px-3 py-2 text-left font-medium">Conversaciones</th>
                  {catalog.packages.map((pkg) => (
                    <th key={pkg.public_slug} className="px-3 py-2 text-right font-medium">
                      {pkg.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catalog.tiers.map((tier) => (
                  <tr key={tier.code} className="border-border-soft border-b last:border-0">
                    <td className="px-3 py-2.5 tabular-nums">
                      <b className="font-medium">{tier.label}</b>
                      {tier.fee_cents !== null ? (
                        <span className="text-muted-foreground ml-2 text-xs">tramo {formatMoney(tier.fee_cents)}</span>
                      ) : null}
                    </td>
                    {catalog.packages.map((pkg) => {
                      const cell = cells.find((price) => price.plan === pkg.public_slug && price.tier === tier.code);
                      if (!cell) {
                        return (
                          <td key={pkg.public_slug} className="text-muted-foreground px-3 py-2.5 text-right">
                            —
                          </td>
                        );
                      }
                      const promoPrice =
                        promo && (promo.scope === "all" || promo.scope === "packages")
                          ? discountedCents(
                              interval === "annual" ? cell.amount_cents / 11 : cell.amount_cents,
                              promo.percent_bps,
                              promo.rounding,
                            ) * (interval === "annual" ? 11 : 1)
                          : null;
                      return (
                        <td key={pkg.public_slug} className="px-3 py-2.5 text-right tabular-nums">
                          {promoPrice !== null ? (
                            <>
                              <span className="text-muted-foreground block text-xs line-through">{formatMoney(cell.amount_cents)}</span>
                              <span className="font-semibold">{formatMoney(promoPrice)}</span>
                            </>
                          ) : (
                            <span className="font-semibold">{formatMoney(cell.amount_cents)}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-muted-foreground mt-2 text-xs">
              {interval === "annual" ? "Precio del año: doce meses de servicio, once facturados." : "Precio al mes."}
              {promo ? ` Con ${promo.name} (−${(promo.percent_bps / 100).toFixed(0)} %) tachado el de lista.` : ""}
            </p>
          </div>
        )}
      </section>

      <div className="flex flex-col gap-4">
        <section className="border-border-soft bg-card rounded-2xl border p-4 shadow-[var(--shadow-float)]">
          <h2 className="text-[15px] font-semibold">Promoción publicada</h2>
          {promo === null ? (
            <p className="text-muted-foreground mt-2 text-sm">Ninguna abierta a esta fecha: la landing muestra precio de lista y sin contador.</p>
          ) : (
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-baseline justify-between">
                <span className="font-medium">{promo.name}</span>
                <span className="tabular-nums">
                  <b>{promo.taken}</b>
                  <span className="text-muted-foreground"> de {promo.slots ?? "∞"} tomados</span>
                </span>
              </div>
              {promo.slots !== null ? (
                <div className="bg-secondary h-2 overflow-hidden rounded-full">
                  <div className="bg-brand h-full rounded-full" style={{ width: `${Math.min(100, (promo.taken / promo.slots) * 100)}%` }} />
                </div>
              ) : null}
              <p className="text-muted-foreground text-xs">
                Cierra el {promo.ends_at ? formatShortDate(new Date(new Date(promo.ends_at).getTime() - 1).toISOString()) : "—"} ·{" "}
                {promo.indexation_policy === "ipc_annual" ? "tarifa ajustada solo por inflación" : "tarifa congelada en pesos"}
              </p>
            </div>
          )}
        </section>

        <section className="border-border-soft bg-card rounded-2xl border p-4 shadow-[var(--shadow-float)]">
          <h2 className="text-[15px] font-semibold">Módulos publicados</h2>
          {catalog.modules.length === 0 ? (
            <p className="text-muted-foreground mt-2 text-sm">Sin módulos vendibles a esta fecha.</p>
          ) : (
            <ul className="mt-2 divide-y text-sm">
              {catalog.modules.map((module) => {
                const price = catalog.prices.find((row) => row.plan === module.public_slug && row.tier === null && row.interval === interval);
                return (
                  <li key={module.public_slug} className="flex items-center justify-between py-2">
                    <span>{module.name}</span>
                    <span className="tabular-nums">{price ? formatMoney(price.amount_cents) : <span className="text-muted-foreground">sin precio {interval === "annual" ? "anual" : ""}</span>}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="border-border-soft bg-card rounded-2xl border p-4 shadow-[var(--shadow-float)]">
          <h2 className="text-[15px] font-semibold">Cómo llega un precio a la pantalla</h2>
          <ol className="text-muted-foreground mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed">
            <li>La landing revalida cada 60 s y pide el catálogo con su ETag.</li>
            <li>El API sirve de Redis (60 s) o resuelve contra la base.</li>
            <li>Publicar una celda, cerrar una promoción o mover un tramo vacía la caché por evento.</li>
            <li>Si el API no responde, la landing muestra «precios a consulta» hasta la siguiente revalidación.</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
