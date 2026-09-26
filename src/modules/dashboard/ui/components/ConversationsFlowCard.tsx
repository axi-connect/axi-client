"use client";

import dynamic from "next/dynamic";
import { cn } from "@/core/lib/utils";
import { formatInteger } from "@/core/lib/commercial-units";
import { CardEmpty } from "@/shared/components/features/card-empty";
import { BentoLink, BentoTile } from "@/shared/components/features/bento";
import { CHART_COLORS } from "@/shared/components/features/charts/chart-theme";
import { PERIOD_PHRASES, type ConversationStatsDTO, type DashboardPeriod } from "@/modules/dashboard/domain/dashboard";
import type { Section } from "@/modules/dashboard/infrastructure/stores/dashboard.store";
import { TileError, TileSkeleton } from "@/modules/dashboard/ui/components/parts";

// Recharts solo en cliente: fuera del bundle inicial y sin SSR.
const AreaTrend = dynamic(
  () => import("@/shared/components/features/charts/AreaTrend").then((m) => m.AreaTrend),
  { ssr: false, loading: () => <div className="bg-muted h-[160px] animate-pulse rounded-xl" /> },
);

/** La marca del eje en la zona del negocio: «09 h» hoy, «23 sept» en días. */
function formatBucket(iso: string, period: DashboardPeriod, timeZone?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return period === "today"
    ? `${date.toLocaleTimeString("es-CO", { hour: "2-digit", hourCycle: "h23", timeZone })} h`
    : date.toLocaleDateString("es-CO", { day: "numeric", month: "short", timeZone });
}

function Figure({ label, short, value, unit, divided }: { label: string; short?: string; value: number; unit?: string; divided?: boolean }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", divided && "border-border border-l pl-4 sm:pl-6")}>
      <span className="text-muted-foreground truncate text-xs">
        {short ? (
          <>
            <span className="sm:hidden">{short}</span>
            <span className="hidden sm:inline">{label}</span>
          </>
        ) : (
          label
        )}
      </span>
      <p className="flex items-baseline gap-2 whitespace-nowrap">
        <span className="font-heading text-3xl leading-none font-bold tracking-tight tabular-nums sm:text-4xl">{formatInteger(value)}</span>
        {unit ? <span className="text-muted-foreground hidden truncate text-sm sm:inline">{unit}</span> : null}
      </p>
    </div>
  );
}

/**
 * Conversaciones — GET /inbox/stats: cuántas entraron, cuántas se
 * resolvieron, cuántas siguen abiertas y quién las resolvió. Coral para las
 * nuevas (la marca) y tinta punteada para las resueltas; el violeta es la IA.
 */
export function ConversationsFlowCard({
  section,
  period,
  timeZone,
  onRetry,
  className,
}: {
  section: Section<ConversationStatsDTO>;
  period: DashboardPeriod;
  timeZone?: string;
  onRetry: () => Promise<void>;
  className?: string;
}) {
  // Con dato, la etiqueta y el eje son los del DATO: al cambiar de período el anterior sigue a la vista hasta que
  // llega el nuevo, y no puede llevar el nombre del nuevo (auditoría, P2-4).
  const shown = section.data?.period ?? period;
  const label = `Conversaciones ${PERIOD_PHRASES[shown]}`;
  if (section.status === "error") {
    return <TileError label={label} message={section.error ?? "No se pudo cargar el flujo."} onRetry={onRetry} className={className} />;
  }
  if (section.data === null) return <TileSkeleton label={label} lines={4} className={className} />;

  const stats = section.data;
  const hasData = stats.new_count > 0 || stats.resolved_count > 0 || stats.open_now > 0;

  return (
    <BentoTile
      label={label}
      aside={<BentoLink href="/workspace/inbox">Inbox</BentoLink>}
      busy={section.status === "loading"}
      className={cn("gap-5", className)}
    >
      {hasData ? (
        <>
          <div className="grid grid-cols-3">
            <Figure label="Nuevas" value={stats.new_count} />
            <Figure label="Resueltas" value={stats.resolved_count} divided />
            <Figure
              label="Abiertas ahora"
              short="Abiertas"
              value={stats.open_now}
              unit={stats.queued_now > 0 ? `${formatInteger(stats.queued_now)} en cola` : undefined}
              divided
            />
          </div>
          <div className="flex flex-col gap-2">
            <AreaTrend
              data={stats.series.map((point) => ({ bucket: point.bucket, Nuevas: point.new, Resueltas: point.resolved }))}
              xKey="bucket"
              series={[
                { key: "Nuevas", label: "Nuevas", color: CHART_COLORS.brand },
                { key: "Resueltas", label: "Resueltas", color: "var(--color-foreground)", dashed: true, fill: false },
              ]}
              formatX={(value) => formatBucket(value, shown, timeZone)}
              height={160}
              yAxis={false}
            />
            <div className="text-muted-foreground flex gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span aria-hidden="true" className="bg-brand h-[3px] w-3.5 rounded-full" />
                Nuevas
              </span>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span aria-hidden="true" className="border-foreground/60 w-3.5 border-t-2 border-dashed" />
                Resueltas
              </span>
            </div>
          </div>
          {stats.resolved_count > 0 ? <WhoResolved ai={stats.ai_resolved_pct} human={stats.human_resolved_pct} /> : null}
        </>
      ) : (
        <CardEmpty glyph="conversation" message="Aún no hay conversaciones en este período. Llegan por tus canales conectados." />
      )}
    </BentoTile>
  );
}

/** Quién resolvió: la IA (violeta) y el equipo, en una barra partida. */
function WhoResolved({ ai, human }: { ai: number; human: number }) {
  return (
    <div className="border-border flex flex-col gap-2.5 border-t pt-4">
      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          <span aria-hidden="true" className="bg-accent-violet size-2 rounded-full" />
          La IA resolvió el <b className="font-semibold tabular-nums">{Math.round(ai)} %</b>
        </span>
        <span className="text-muted-foreground whitespace-nowrap">
          tu equipo, el <b className="text-foreground font-semibold tabular-nums">{Math.round(human)} %</b>
        </span>
      </div>
      <div aria-hidden="true" className="flex h-2 gap-[3px]">
        <span className="from-accent-violet/70 to-accent-violet rounded-full bg-gradient-to-r" style={{ width: `${String(ai)}%` }} />
        <span className="bg-foreground/20 flex-1 rounded-full" />
      </div>
    </div>
  );
}
