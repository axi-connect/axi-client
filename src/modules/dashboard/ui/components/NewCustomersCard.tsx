"use client";

import { cn } from "@/core/lib/utils";
import { formatInteger } from "@/core/lib/commercial-units";
import {
  CONTACT_STAGE_LABELS,
  PERIOD_PHRASES,
  type ContactStatsDTO,
  type DashboardPeriod,
} from "@/modules/dashboard/domain/dashboard";
import type { Section } from "@/modules/dashboard/infrastructure/stores/dashboard.store";
import { Sparkline, TileError, TileSkeleton } from "@/modules/dashboard/ui/components/parts";
import { BentoFigure, BentoLink, BentoTile } from "@/shared/components/features/bento";

/**
 * El reparto por etapa, en tinta y coral: el cliente (la etapa que vende) es
 * el coral; el resto, tinta con más o menos peso. Sin ámbar: una vista no
 * mezcla los tres acentos (DESIGN §3.1) y el violeta ya es la IA.
 */
const STAGES = [
  { key: "prospect", swatch: "bg-foreground" },
  { key: "lead", swatch: "bg-foreground/40" },
  { key: "customer", swatch: "bg-brand" },
  { key: "other", swatch: "bg-foreground/15" },
] as const;

/** Clientes nuevos (CRM) — GET /contacts/stats: cuántos, cuándo y en qué etapa. */
export function NewCustomersCard({
  section,
  period,
  onRetry,
  className,
}: {
  section: Section<ContactStatsDTO>;
  period: DashboardPeriod;
  onRetry: () => Promise<void>;
  className?: string;
}) {
  const label = `Clientes nuevos ${PERIOD_PHRASES[period]}`;
  if (section.status === "error") {
    return <TileError label={label} message={section.error ?? "No se pudieron cargar los clientes."} onRetry={onRetry} className={className} />;
  }
  if (section.data === null) return <TileSkeleton label={label} lines={3} className={className} />;

  const stats = section.data;
  const aside = <BentoLink href="/crm/contacts">Contactos</BentoLink>;
  if (stats.new_count === 0) {
    return (
      <BentoTile label={label} aside={aside} className={className}>
        <BentoFigure value="0" unit="contactos nuevos" />
        <p className="text-muted-foreground text-xs text-pretty">Cada persona que escriba por primera vez queda aquí como prospecto.</p>
      </BentoTile>
    );
  }

  const stages = STAGES.filter((stage) => stats.by_stage[stage.key] > 0);
  return (
    <BentoTile label={label} aside={aside} className={cn("gap-3.5", className)}>
      <BentoFigure value={formatInteger(stats.new_count)} unit={stats.new_count === 1 ? "contacto nuevo" : "contactos nuevos"} />
      <Sparkline values={stats.series.map((point) => point.count)} height={76} className="my-1" />
      <div aria-hidden="true" className="flex h-2 gap-[3px]">
        {stages.map((stage) => (
          <span
            key={stage.key}
            className={cn("rounded-full", stage.swatch)}
            style={{ width: `${String((stats.by_stage[stage.key] / stats.new_count) * 100)}%` }}
          />
        ))}
      </div>
      <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {stages.map((stage) => (
          <li key={stage.key} className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span aria-hidden="true" className={cn("size-1.5 rounded-full", stage.swatch)} />
            {CONTACT_STAGE_LABELS[stage.key]}
            <b className="text-foreground font-semibold tabular-nums">{formatInteger(stats.by_stage[stage.key])}</b>
          </li>
        ))}
      </ul>
    </BentoTile>
  );
}
