"use client";

/**
 * Tablero «Capacidades» (upgrade quality F5): las 18 capacidades del agente
 * de un tenant con su estado según las últimas ejecuciones QA y probe de 90
 * días. Primero lo que falla. Sin muestra → «Sin probar» con CTA a ejecutar.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Play } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { StatTile } from "@/shared/components/features/stat-tile";
import { TableSkeleton } from "@/shared/components/features/loading";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  CAPABILITY_STATUS_KEY,
  capabilityMetricText,
  capabilitySampleText,
  countByStatus,
  sortCapabilities,
} from "../../../../domain/quality-capabilities";
import { useCapabilitiesQuery } from "../../../../infrastructure/api/hooks/use-quality-capabilities";
import { EmptyState } from "../../../components/EmptyState";
import { ProblemAlert } from "../../../components/ProblemAlert";
import { StatusBadge } from "../../../components/StatusBadge";
import { TenantSelect } from "../../../components/TenantSelect";

export function CapabilitiesView() {
  const [companyId, setCompanyId] = useState<string>("");
  const query = useCapabilitiesQuery(companyId || null);
  const report = query.data;
  const rows = useMemo(() => sortCapabilities(report?.capabilities ?? []), [report]);
  const counts = countByStatus(rows);
  const newRunHref = companyId ? `/platform/quality/runs/new` : "/platform/quality/runs/new";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <TenantSelect value={companyId} onValueChange={setCompanyId} ariaLabel="Tenant" placeholder="Elige el tenant" className="w-56" />
          <span className="text-sm text-muted-foreground">
            últimas ejecuciones completadas · {report?.window_days ?? 90} días
            {report ? ` · ${report.runs_considered} ${report.runs_considered === 1 ? "ejecución" : "ejecuciones"}` : ""}
          </span>
        </div>
        <Button asChild variant="outline">
          <Link href={newRunHref} prefetch={false}>
            <Play aria-hidden="true" />
            Ejecutar capabilities_core
          </Link>
        </Button>
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Aprobadas" value={counts.pass} hint={`de ${rows.length}`} tone="success" />
            <StatTile label="En alerta" value={counts.warn} hint="0,7–0,9" tone={counts.warn > 0 ? "warning" : "default"} />
            <StatTile label="Fallidas" value={counts.fail} hint="< 0,7" tone={counts.fail > 0 ? "destructive" : "default"} />
            <StatTile label="Sin probar" value={counts.untested} hint="sin escenario ni probe" />
          </div>
          <div className="overflow-x-auto rounded-2xl border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Capacidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Métrica</TableHead>
                  <TableHead className="text-right">Muestra</TableHead>
                  <TableHead>Cuándo</TableHead>
                  <TableHead aria-label="Abrir ejecución" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((capability) => (
                  <TableRow key={capability.code}>
                    <TableCell className="max-w-72">
                      <span className="block font-medium">{capability.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">{capability.description}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={CAPABILITY_STATUS_KEY[capability.status]} />
                    </TableCell>
                    <TableCell className="tabular-nums">{capabilityMetricText(capability)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{capabilitySampleText(capability)}</TableCell>
                    <TableCell>
                      {capability.evaluated_at ? (
                        <RelativeDate iso={capability.evaluated_at} className="text-muted-foreground" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            Cifra: el probe de la capacidad si existe; si no, los checks deterministas de sus criterios; si no, los casos de sus escenarios.
            Semáforo ≥ 0,9 aprobada · 0,7–0,9 en alerta · &lt; 0,7 fallida. La voz queda fuera: el simulador está excluido de la política de voz.
          </p>
        </>
      )}
    </div>
  );
}
