"use client";

/**
 * Tabla de alertas de plataforma — 100% READ-ONLY (no existe endpoint de
 * mutación; no se simulan acciones, spec D13). Barra valor-vs-umbral con
 * `alertProgressPct`; fila → detalle del tenant.
 */
import { useRouter } from "next/navigation";
import { cn } from "@/core/lib/utils";
import { formatShortDate } from "@/core/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import type { PlatformAlert } from "../../../domain/analytics";
import { alertProgressPct } from "../../../domain/thresholds";
import { RelativeDate } from "../../components/RelativeDate";

function ThresholdBar({ alert }: { alert: PlatformAlert }) {
  const pct = alertProgressPct(alert.value_at_trigger, alert.threshold);
  const over = pct >= 100;
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <span
          className={cn("block h-full rounded-full", over ? "bg-destructive" : "bg-warning")}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="tabular-nums text-xs text-muted-foreground">
        {alert.value_at_trigger.toLocaleString("es-CO")} / {alert.threshold.toLocaleString("es-CO")}
      </span>
    </span>
  );
}

export function AlertsTable({ alerts }: { alerts: PlatformAlert[] }) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Regla</TableHead>
            <TableHead>Tenant</TableHead>
            <TableHead>Valor vs umbral</TableHead>
            <TableHead>Ventana</TableHead>
            <TableHead>Creada</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert) => (
            <TableRow
              key={alert.id}
              onClick={() => router.push(`/platform/tenants/${alert.company_id}`)}
              // Operable por teclado: la fila navega igual que el click.
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/platform/tenants/${alert.company_id}`);
                }
              }}
              aria-label={`Ver tenant de la alerta ${alert.rule}`}
              className="cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <TableCell>
                <span className="font-mono text-xs">{alert.rule}</span>
                {alert.subject_type && (
                  <span className="ml-1.5 text-xs text-muted-foreground">({alert.subject_type})</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {alert.company_name ?? `${alert.company_id.slice(0, 8)}…`}
              </TableCell>
              <TableCell><ThresholdBar alert={alert} /></TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatShortDate(alert.window_start)}
              </TableCell>
              <TableCell>
                <RelativeDate iso={alert.created_at} className="text-xs text-muted-foreground" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
