"use client";

import { ArrowRight, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { errorMessage } from "@/core/lib/error-messages";
import { cn } from "@/core/lib/utils";
import type { DuplicatePairDTO } from "@/modules/crm/domain/contact";
import { newContactsSplit, type ContactStatsDTO, type ContactStatsPeriod } from "@/modules/crm/domain/contact-summary";
import { getContactStats, listDuplicates } from "@/modules/crm/infrastructure/services/contacts-service.adapter";
import { BentoFigure, BentoTile, InkIsland, Kicker } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { Skeleton } from "@/shared/components/ui/skeleton";

const PERIODS: ReadonlyArray<{ value: ContactStatsPeriod; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
];

type Load<T> = { kind: "loading" } | { kind: "ready"; data: T } | { kind: "error"; message: string };

/** La misma rejilla en la silueta y en el contenido: nada salta al llegar los datos. */
const ITEM = "w-[17.5rem] shrink-0 snap-start @min-[56rem]:w-auto";

function TileError({ label, message, onRetry, className }: { label: string; message: string; onRetry: () => void; className?: string }) {
  return (
    <BentoTile label={label} className={className}>
      <div role="alert" className="flex flex-1 flex-col items-start justify-center gap-2">
        <p className="text-sm text-pretty text-muted-foreground">{message}</p>
        <Button variant="outline" size="sm" className="rounded-full" onClick={onRetry}>
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reintentar
        </Button>
      </div>
    </BentoTile>
  );
}

/**
 * El resumen de la lista de contactos (lienzo CRM premium F2, tablero 1):
 * cuántos llegaron y en qué etapa, y UNA isla con lo accionable —los posibles
 * duplicados—. Se dimensiona por el ANCHO DEL CONTENIDO (`@container`, §9.5):
 * por debajo de 56 rem es una fila que scrollea dentro de sí misma con la
 * barra de marca, nunca el body.
 */
export function ContactsSummary() {
  const router = useRouter();
  const [period, setPeriod] = useState<ContactStatsPeriod>("7d");
  const [stats, setStats] = useState<Load<ContactStatsDTO>>({ kind: "loading" });
  const [dupes, setDupes] = useState<Load<DuplicatePairDTO[]>>({ kind: "loading" });

  const loadStats = useCallback((next: ContactStatsPeriod) => {
    setStats({ kind: "loading" });
    getContactStats(next)
      .then((data) => setStats({ kind: "ready", data }))
      .catch((err: unknown) => setStats({ kind: "error", message: errorMessage(err, "No pudimos leer los nuevos.") }));
  }, []);

  const loadDupes = useCallback(() => {
    setDupes({ kind: "loading" });
    listDuplicates()
      .then((data) => setDupes({ kind: "ready", data }))
      .catch((err: unknown) => setDupes({ kind: "error", message: errorMessage(err, "No pudimos buscar duplicados.") }));
  }, []);

  useEffect(() => loadStats(period), [loadStats, period]);
  useEffect(() => loadDupes(), [loadDupes]);

  const periodLabel = PERIODS.find((p) => p.value === period)?.label.toLowerCase() ?? "";

  return (
    <div className="@container shrink-0">
      <section
        aria-label="Resumen de contactos"
        className="sidebar-scroll -mx-4 flex snap-x gap-3 overflow-x-auto overscroll-x-contain scroll-px-4 px-4 pb-2 md:-mx-6 md:scroll-px-6 md:px-6 @min-[56rem]:mx-0 @min-[56rem]:grid @min-[56rem]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(17rem,20rem)] @min-[56rem]:gap-4 @min-[56rem]:overflow-visible @min-[56rem]:px-0 @min-[56rem]:pb-0"
      >
        <BentoTile
          label="Nuevos"
          className={ITEM}
          aside={
            <SegmentedControl value={period} onValueChange={setPeriod} items={PERIODS} label="Período de los nuevos" size="sm" surface="inline" />
          }
        >
          {stats.kind === "loading" ? (
            <Skeleton className="h-16 rounded-2xl" />
          ) : stats.kind === "error" ? (
            <div role="alert" className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{stats.message}</p>
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => loadStats(period)}>
                Reintentar
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-5">
              <BentoFigure value={String(stats.data.new_count)} unit={stats.data.new_count === 1 ? "contacto" : "contactos"} />
              <NewSeries stats={stats.data} />
            </div>
          )}
        </BentoTile>

        {stats.kind === "error" ? (
          <TileError label="Cómo llegan los nuevos" message="Sin el reparto por ahora." onRetry={() => loadStats(period)} className={ITEM} />
        ) : (
          <BentoTile label={`Cómo llegan los nuevos · ${periodLabel}`} className={ITEM}>
            {stats.kind === "loading" ? <Skeleton className="h-12 rounded-2xl" /> : <StageSplit stats={stats.data} />}
          </BentoTile>
        )}

        <DuplicatesIsland state={dupes} onRetry={loadDupes} onReview={() => router.push("/crm/contacts/duplicates")} />
      </section>
    </div>
  );
}

/** Barras por día (o por semana): la última en coral, el resto en tinta. Decorativas: la cifra ya va escrita. */
function NewSeries({ stats }: { stats: ContactStatsDTO }) {
  const series = stats.series;
  if (series.length === 0) return <span />;
  const max = Math.max(1, ...series.map((point) => point.count));
  return (
    <div aria-hidden="true" className="flex h-12 min-w-0 items-end gap-1">
      {series.map((point, index) => (
        <span
          key={point.bucket}
          className={cn("min-w-1 flex-1 rounded-md", index === series.length - 1 ? "bg-brand" : "bg-foreground/80")}
          style={{ height: `${Math.max(12, Math.round((point.count / max) * 100))}%` }}
        />
      ))}
    </div>
  );
}

function StageSplit({ stats }: { stats: ContactStatsDTO }) {
  const split = newContactsSplit(stats);
  if (split.total === 0) {
    return <p className="text-sm text-pretty text-muted-foreground">Aún no llega nadie en este período.</p>;
  }
  // Monocromo a propósito: tres pesos de tinta, sin sumar colores al bento (DESIGN §3.1).
  const shade = { prospect: "bg-foreground/25", lead: "bg-foreground/55", customer: "bg-foreground" } as const;
  return (
    <>
      <div aria-hidden="true" className="mt-1 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
        {split.parts.map((part) => (
          <span key={part.key} className={shade[part.key]} style={{ width: `${part.pct}%` }} />
        ))}
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
        {split.parts.map((part) => (
          <span key={part.key} className="whitespace-nowrap">
            <strong className="font-semibold text-foreground tabular-nums">{part.count}</strong> {part.label}
          </span>
        ))}
      </p>
    </>
  );
}

function DuplicatesIsland({
  state,
  onRetry,
  onReview,
}: {
  state: Load<DuplicatePairDTO[]>;
  onRetry: () => void;
  onReview: () => void;
}) {
  const shell = "w-[18rem] shrink-0 snap-start gap-1.5 p-5 @min-[56rem]:w-auto";
  if (state.kind === "loading") return <Skeleton className="h-[132px] w-[18rem] shrink-0 snap-start rounded-3xl @min-[56rem]:w-auto" />;
  if (state.kind === "error") {
    return (
      <InkIsland label="Lo próximo" className={shell}>
        <Kicker>Lo próximo</Kicker>
        <p className="text-sm text-pretty text-muted-foreground">{state.message}</p>
        <Button variant="glass" size="sm" className="mt-1 w-fit" onClick={onRetry}>
          Reintentar
        </Button>
      </InkIsland>
    );
  }
  const pairs = state.data;
  const first = pairs[0];
  return (
    <InkIsland label="Lo próximo" className={shell}>
      <Kicker>Lo próximo</Kicker>
      {first === undefined ? (
        <>
          <p className="font-heading text-xl leading-tight font-bold">Sin duplicados aparentes</p>
          <p className="text-xs text-pretty text-muted-foreground">Tu base está limpia: nadie comparte correo ni un nombre muy parecido.</p>
        </>
      ) : (
        <>
          <p className="font-heading text-xl leading-tight font-bold whitespace-nowrap">
            {pairs.length === 1 ? "1 posible duplicado" : `${pairs.length} posibles duplicados`}
          </p>
          <p className="truncate text-xs text-muted-foreground" title={`${first.a_name ?? "Sin nombre"} y ${first.b_name ?? "Sin nombre"}`}>
            {first.a_name ?? "Sin nombre"} y {first.b_name ?? "Sin nombre"}
          </p>
          <Button variant="contrast" size="sm" className="mt-1 w-fit rounded-full" onClick={onReview}>
            Revisar
            <ArrowRight aria-hidden="true" />
          </Button>
        </>
      )}
    </InkIsland>
  );
}
