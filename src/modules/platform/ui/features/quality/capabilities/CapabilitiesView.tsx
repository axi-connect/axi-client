"use client";

/**
 * Tablero «Capacidades» (upgrade quality F5; diseño premium F3): las 18
 * capacidades del agente de un tenant con su estado según las ejecuciones QA y
 * probe de 90 días. Arriba cuatro cifras y la isla «Lo más urgente»; debajo la
 * lista agrupada por familia, con un medidor que marca los umbrales 0,7 y 0,9.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Play } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { TableSkeleton } from "@/shared/components/features/loading";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import {
  CAPABILITY_STATUS_KEY,
  capabilityMetricText,
  capabilityMetricValue,
  capabilitySampleText,
  countByStatus,
  groupCapabilities,
  mostUrgentCapability,
  sortCapabilities,
  type Capability,
  type CapabilityStatus,
} from "../../../../domain/quality-capabilities";
import { useCapabilitiesQuery } from "../../../../infrastructure/api/hooks/use-quality-capabilities";
import { EmptyState } from "../../../components/EmptyState";
import { ProblemAlert } from "../../../components/ProblemAlert";
import { TenantSelect } from "../../../components/TenantSelect";
import { BigFigure, InkPanel, Kicker, Meter, QualityStatus, QualityTile, ToneDot } from "../shared/premium";

type Filter = "all" | "problems" | "untested";

const SEGMENT: Record<CapabilityStatus, string> = {
  pass: "bg-foreground",
  warn: "bg-warning",
  fail: "bg-destructive",
  untested: "bg-muted ring-1 ring-inset ring-border",
};

const METER_TONE: Record<CapabilityStatus, "default" | "warning" | "destructive" | "muted"> = {
  pass: "default",
  warn: "warning",
  fail: "destructive",
  untested: "muted",
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function CapabilitiesView() {
  const [companyId, setCompanyId] = useState<string>("");
  const [filter, setFilter] = useState<Filter>("all");
  const query = useCapabilitiesQuery(companyId || null);
  const report = query.data;
  const rows = useMemo(() => sortCapabilities(report?.capabilities ?? []), [report]);
  const counts = countByStatus(rows);
  const urgent = mostUrgentCapability(rows);
  const visible = rows.filter((row) =>
    filter === "all" ? true : filter === "problems" ? row.status === "fail" || row.status === "warn" : row.status === "untested",
  );
  const groups = groupCapabilities(visible);
  const warnLabels = rows.filter((row) => row.status === "warn").map((row) => row.label);
  const failLabels = rows.filter((row) => row.status === "fail").map((row) => row.label);
  const untestedLabels = rows.filter((row) => row.status === "untested").map((row) => row.label);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          {report && (
            <span
              aria-hidden="true"
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-foreground font-heading text-xl font-bold text-background dark:border dark:border-border dark:bg-secondary dark:text-foreground"
            >
              {initials(report.company_name)}
            </span>
          )}
          <div className="min-w-0 space-y-1">
            <h2 className="truncate text-2xl leading-tight font-bold tracking-tight">{report?.company_name ?? "Capacidades"}</h2>
            <p className="text-sm text-muted-foreground">
              <span className="whitespace-nowrap">Últimas ejecuciones completadas</span> ·{" "}
              <span className="whitespace-nowrap">{report?.window_days ?? 90} días</span>
              {report && (
                <>
                  {" "}
                  ·{" "}
                  <span className="whitespace-nowrap">
                    {report.runs_considered} {report.runs_considered === 1 ? "ejecución" : "ejecuciones"}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TenantSelect value={companyId} onValueChange={setCompanyId} ariaLabel="Tenant" placeholder="Elige el tenant" className="w-56" />
          <Button asChild>
            <Link href="/platform/quality/runs/new" prefetch={false}>
              <Play aria-hidden="true" />
              Ejecutar capabilities_core
            </Link>
          </Button>
        </div>
      </div>

      {!companyId ? (
        <EmptyState
          glyph="ai"
          title="Elige un tenant"
          description="El tablero cruza las capacidades del agente con sus ejecuciones QA y probes de los últimos 90 días."
        />
      ) : query.isPending ? (
        <TableSkeleton rows={8} />
      ) : query.isError ? (
        <ProblemAlert error={query.error} onRetry={() => void query.refetch()} />
      ) : report && report.runs_considered === 0 ? (
        <EmptyState
          glyph="ai"
          title="Sin ejecuciones en la ventana"
          description="Corre la suite capabilities_core (y los probes de búsqueda, reconocimiento e intención) para llenar el tablero."
          action={
            <Button variant="outline" asChild>
              <Link href="/platform/quality/runs/new" prefetch={false}>
                Ejecutar capabilities_core
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 min-[1400px]:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid min-w-0 grid-cols-2 gap-4 xl:grid-cols-4">
              <QualityTile label="Aprobadas" as="article">
                <BigFigure value={counts.pass} unit={`de ${rows.length}`} />
                <div aria-hidden="true" className="mt-auto flex gap-[3px]">
                  {rows
                    .slice()
                    .sort((a, b) => ["pass", "warn", "fail", "untested"].indexOf(a.status) - ["pass", "warn", "fail", "untested"].indexOf(b.status))
                    .map((row) => (
                      <span key={row.code} className={cn("h-2 min-w-0 flex-1 rounded-full", SEGMENT[row.status])} />
                    ))}
                </div>
              </QualityTile>
              <CountTile label="En alerta" tone="warning" value={counts.warn} names={warnLabels} hint="entre 0,70 y 0,90" />
              <CountTile label="Fallidas" tone="destructive" value={counts.fail} names={failLabels} hint="por debajo de 0,70" />
              <CountTile label="Sin probar" tone="neutral" value={counts.untested} names={untestedLabels} hint="sin escenario ni probe" />
            </div>
            <UrgentPanel urgent={urgent} anyTested={counts.untested < rows.length} />
          </div>

          <section className="min-w-0 overflow-hidden rounded-3xl border border-border bg-card" aria-labelledby="caps-title">
            <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <h3 id="caps-title" className="text-lg font-bold">
                  Las {rows.length} capacidades
                </h3>
                <p className="text-xs text-muted-foreground">
                  <span className="whitespace-nowrap">aprobada ≥ 0,90</span> · <span className="whitespace-nowrap">alerta 0,70–0,90</span> ·{" "}
                  <span className="whitespace-nowrap">fallida &lt; 0,70</span>
                </p>
              </div>
              <SegmentedControl<Filter>
                label="Filtrar capacidades"
                size="sm"
                surface="inline"
                value={filter}
                onValueChange={setFilter}
                items={[
                  { value: "all", label: "Todas" },
                  { value: "problems", label: "Con problemas", count: counts.fail + counts.warn },
                  { value: "untested", label: "Sin probar", count: counts.untested },
                ]}
              />
            </header>

            <div className="hidden grid-cols-[minmax(0,1.5fr)_128px_minmax(0,1.4fr)_96px_minmax(0,1fr)_88px] gap-4 border-t border-border px-5 py-2 text-xs text-muted-foreground lg:grid">
              <span>Capacidad</span>
              <span>Estado</span>
              <span>Métrica principal</span>
              <span>Muestra</span>
              <span>Evidencia</span>
              <span />
            </div>

            {groups.length === 0 ? (
              <p className="border-t border-border px-5 py-8 text-center text-sm text-muted-foreground">Ninguna capacidad en este filtro.</p>
            ) : (
              groups.map((group) => (
                <div key={group.key}>
                  <p className="flex items-center justify-between bg-muted px-5 py-2 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                    <span>{group.label}</span>
                    <span className="tabular-nums">{group.items.length}</span>
                  </p>
                  <ul>
                    {group.items.map((capability) => (
                      <CapabilityRow key={capability.code} capability={capability} />
                    ))}
                  </ul>
                </div>
              ))
            )}
            <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
              Cifra: el probe de la capacidad si existe; si no, los checks deterministas de sus criterios; si no, los casos de sus escenarios.
              La voz queda fuera: el simulador está excluido de la política de voz.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

function CountTile({
  label,
  tone,
  value,
  names,
  hint,
}: {
  label: string;
  tone: "warning" | "destructive" | "neutral";
  value: number;
  names: string[];
  hint: string;
}) {
  const shown = names.slice(0, 3);
  const extra = names.length - shown.length;
  return (
    <QualityTile label={label} as="article" aside={<ToneDot tone={tone} className="size-2" />}>
      <BigFigure value={value} />
      <p className="mt-auto line-clamp-2 text-xs leading-relaxed text-muted-foreground" title={names.join(" · ") || undefined}>
        {shown.length > 0 ? `${shown.join(" · ")}${extra > 0 ? ` y ${extra} más` : ""}` : hint}
      </p>
    </QualityTile>
  );
}

function UrgentPanel({ urgent, anyTested }: { urgent: Capability | null; anyTested: boolean }) {
  if (!urgent) {
    return (
      <InkPanel label="Lo más urgente">
        <Kicker>Lo más urgente</Kicker>
        <p className="font-heading text-2xl leading-tight font-bold tracking-tight">{anyTested ? "Nada en rojo" : "Nada probado aún"}</p>
        <p className="text-sm opacity-80">
          {anyTested
            ? "Todas las capacidades con evidencia pasan el umbral. Revisa las que siguen sin probar."
            : "Corre capabilities_core y los probes para saber dónde está flojo el agente."}
        </p>
      </InkPanel>
    );
  }
  return (
    <InkPanel label="Lo más urgente">
      <Kicker>Lo más urgente</Kicker>
      <p className="font-heading text-2xl leading-tight font-bold tracking-tight">
        {urgent.label} {urgent.status === "fail" ? "falla" : "está en alerta"}
      </p>
      <p className="text-sm opacity-80">{urgent.description}</p>
      <p className="text-sm tabular-nums">
        <span className="whitespace-nowrap font-medium">{capabilityMetricText(urgent)}</span>
        {capabilitySampleText(urgent) !== "—" && <span className="whitespace-nowrap opacity-80"> · {capabilitySampleText(urgent)}</span>}
      </p>
      {urgent.run_id && (
        <div className="mt-auto pt-2">
          <Button asChild variant="contrast">
            <Link href={`/platform/quality/runs/${urgent.run_id}`} prefetch={false}>
              Ver la ejecución
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      )}
    </InkPanel>
  );
}

function CapabilityRow({ capability }: { capability: Capability }) {
  return (
    <li className="grid gap-x-4 gap-y-1.5 border-t border-border px-5 py-3 text-sm lg:grid-cols-[minmax(0,1.5fr)_128px_minmax(0,1.4fr)_96px_minmax(0,1fr)_88px] lg:items-center lg:py-2.5">
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{capability.label}</span>
        <span className="truncate text-xs text-muted-foreground" title={capability.description}>
          {capability.description}
        </span>
      </span>
      <span>
        <QualityStatus status={CAPABILITY_STATUS_KEY[capability.status]} />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 font-medium whitespace-nowrap tabular-nums">{capabilityMetricValue(capability)}</span>
          {capability.metric_value !== null && (
            <Meter value={capability.metric_value} marks={[0.7, 0.9]} tone={METER_TONE[capability.status]} className="max-w-40 flex-1" />
          )}
        </span>
        {capability.metric_label && <span className="truncate text-xs text-muted-foreground">{capability.metric_label}</span>}
      </span>
      <span className="whitespace-nowrap text-muted-foreground tabular-nums">{capabilitySampleText(capability)}</span>
      <span className="min-w-0 truncate text-muted-foreground">
        {capability.evaluated_at ? <RelativeDate iso={capability.evaluated_at} /> : "sin evidencia"}
      </span>
      <span className="lg:text-right">
        {capability.run_id ? (
          <Button asChild size="icon" variant="ghost" className="size-8">
            <Link href={`/platform/quality/runs/${capability.run_id}`} prefetch={false} aria-label={`Abrir la ejecución de ${capability.label}`}>
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline">
            <Link href="/platform/quality/runs/new" prefetch={false}>
              Ejecutar
            </Link>
          </Button>
        )}
      </span>
    </li>
  );
}
