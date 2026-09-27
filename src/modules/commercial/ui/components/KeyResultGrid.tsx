"use client";

import Link from "next/link";

import { formatInteger } from "@/core/lib/commercial-units";
import { formatMoney } from "@/core/lib/format";
import type { CommercialPaceDTO, CommercialPlanDTO, KeyResultKey, PaceKeyResultDTO } from "@/modules/commercial/domain/commercial";
import { missingLine, rateLine } from "@/modules/commercial/domain/copy";
import { formatPct, monthLabel } from "@/modules/commercial/domain/format";
import { KR_LABELS, KR_ORDER, PACE_BADGES, PACE_PILL_TONES } from "@/modules/commercial/domain/labels";
import { progressPct } from "@/modules/commercial/domain/pace";
import { StatePill } from "@/shared/components/features/bento";
import { SourceMark } from "./SourceMark";

/**
 * «Lo que hace falta» (canvas 1): los resultados clave derivados de la meta
 * (D8), de la venta hacia atrás y en el orden del plan. Dos columnas desde
 * `@2xl`, una en estrecho. Cada resultado: su cifra de camino recorrido
 * («27 de 43 · faltan 16»), una barra con la marca de dónde deberías ir hoy,
 * el ritmo y de dónde sale su meta; y abre su detalle.
 *
 * En «aprendiendo» no se afirma ritmo: ni píldora, ni marca de hoy, ni tasa;
 * solo camino recorrido y procedencia. El mix de productos va bajo «Ventas» y
 * las contestadas bajo «Llamadas». El ticket tiene su propia ficha en el bento.
 */
export function KeyResultGrid({
  pace,
  plan,
  learning = false,
  detailHref,
}: {
  pace: CommercialPaceDTO;
  plan: CommercialPlanDTO | null;
  learning?: boolean;
  detailHref: (key: KeyResultKey) => string;
}) {
  const niche = plan?.benchmark_niche_label ?? null;
  const byKey = new Map(pace.key_results.map((kr) => [kr.key, kr]));
  const mix = plan?.product_mix.slice(0, 3) ?? [];
  const mixLine = mix.length > 0 ? `Mix sugerido: ${mix.map((row) => `${formatPct(row.share_pct)} ${row.category}`).join(" · ")}` : null;

  return (
    <section aria-labelledby="commercial-krs" className="@container/krs min-w-0 rounded-3xl border border-border bg-card px-5 pt-5 pb-1 @xl:px-7">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 pb-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="commercial-krs" className="font-heading text-xl font-bold tracking-[-0.01em]">
            Lo que hace falta
          </h2>
          <p className="flex flex-wrap gap-x-1.5 text-[12.5px] text-muted-foreground">
            <span>
              Objetivo: vender {formatMoney(pace.target_revenue_cents, pace.currency)} en {monthLabel(pace.period_start)}
            </span>
            <span>· de la venta hacia atrás</span>
          </p>
        </div>
        {learning ? null : (
          <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground">
            <span aria-hidden className="block h-3 w-0.5 rounded-full bg-foreground/60" />
            dónde deberías ir hoy
          </span>
        )}
      </header>
      <ul className="grid grid-cols-1 gap-x-9 @2xl/krs:grid-cols-2">
        {KR_ORDER.flatMap((key) => {
          const kr = byKey.get(key);
          if (kr === undefined) return [];
          const extra =
            key === "sales"
              ? learning
                ? "Aún sin historia para medir el ritmo."
                : mixLine
              : key === "calls" && kr.answered_actual !== null
                ? `Contestadas ${formatInteger(kr.answered_actual)}${kr.answered_expected !== null ? ` de ${formatInteger(kr.answered_expected)}` : ""}`
                : null;
          return [<KeyResultItem key={key} kr={kr} href={detailHref(key)} learning={learning} niche={niche} extra={extra} />];
        })}
      </ul>
    </section>
  );
}

function KeyResultItem({
  kr,
  href,
  learning,
  niche,
  extra,
}: {
  kr: PaceKeyResultDTO;
  href: string;
  learning: boolean;
  niche: string | null;
  extra: string | null;
}) {
  const line = missingLine(kr.actual, kr.target);
  const at = line.indexOf(" ");
  const head = at === -1 ? line : line.slice(0, at);
  const tail = at === -1 ? null : line.slice(at + 1);
  const expected = learning || kr.target <= 0 ? null : progressPct(kr.expected, kr.target);

  return (
    <li className="min-w-0 border-t border-border">
      <Link
        href={href}
        className="group flex min-w-0 flex-col gap-2 rounded-lg py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="flex min-w-0 items-center justify-between gap-3">
          <span className="truncate text-[14.5px] font-medium group-hover:underline">{KR_LABELS[kr.key]}</span>
          {learning ? null : <StatePill tone={PACE_PILL_TONES[kr.status]}>{PACE_BADGES[kr.status]?.label ?? kr.status}</StatePill>}
        </span>
        {/* El espacio entre las dos partes es texto: la línea se lee (y se copia) «27 de 43 · faltan 16». */}
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
          <b className="font-heading text-[30px] leading-none font-bold tracking-[-0.02em] whitespace-nowrap tabular-nums">{head}</b>
          {tail !== null ? (
            <>
              {" "}
              <span className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">{tail}</span>
            </>
          ) : null}
        </span>
        <span aria-hidden className="relative block h-1.5 rounded-full bg-muted">
          <span className="absolute inset-y-0 left-0 rounded-full bg-foreground" style={{ width: `${String(Math.max(2, progressPct(kr.actual, kr.target)))}%` }} />
          {expected !== null ? (
            <span className="absolute -top-1 h-3.5 w-0.5 -translate-x-1/2 rounded-full bg-foreground/60" style={{ left: `${String(expected)}%` }} />
          ) : null}
        </span>
        {learning ? null : (
          <span className="text-[12.5px] text-muted-foreground tabular-nums">
            {rateLine(kr.daily_rate_actual, kr.daily_rate_expected, kr.source, niche).replace(/ · [^·]+$/, "")}
          </span>
        )}
        {extra !== null ? <span className="text-[12.5px] text-muted-foreground">{extra}</span> : null}
        <SourceMark source={kr.source} nicheLabel={niche} className="text-xs" />
      </Link>
    </li>
  );
}
