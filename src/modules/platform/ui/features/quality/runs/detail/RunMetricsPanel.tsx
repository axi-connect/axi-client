/**
 * Métricas agregadas de la ejecución (`metrics` es null hasta finalizar; el
 * Json opaco pasa por `parseRunMetrics`, cualquier forma rara degrada sin
 * romper). Latencias con semáforo de `thresholds.ts`. Las muestras de cola
 * (solo estrés) se exponen colapsadas en crudo — son material de diagnóstico.
 */
import { parseRunMetrics, type RunDetail } from "../../../../../domain/quality-runs";
import { latencyTone } from "../../../../../domain/thresholds";
import { formatLatency } from "../../../analytics/analytics-format";
import { MetricCell } from "../../../analytics/MetricCell";

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">{children}</dd>
    </div>
  );
}

const RATE = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

function formatRate(value: number | null, unit: string): string {
  if (value === null) return "—";
  return `${RATE.format(value)} ${unit}`;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes} m ${seconds} s` : `${seconds} s`;
}

export function RunMetricsPanel({ run }: { run: RunDetail }) {
  const metrics = parseRunMetrics(run.metrics);

  if (!metrics) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        Las métricas agregadas (latencias, throughput) estarán disponibles al finalizar la ejecución.
      </p>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-background p-4">
      <h3 className="text-base font-semibold">Métricas</h3>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Turnos totales">{metrics.turns_total ?? "—"}</Metric>
        <Metric label="Latencia p50">
          <MetricCell tone={latencyTone(metrics.reply_e2e_p50_ms)}>
            {formatLatency(metrics.reply_e2e_p50_ms)}
          </MetricCell>
        </Metric>
        <Metric label="Latencia p95">
          <MetricCell tone={latencyTone(metrics.reply_e2e_p95_ms)}>
            {formatLatency(metrics.reply_e2e_p95_ms)}
          </MetricCell>
        </Metric>
        <Metric label="Conversaciones/min">{formatRate(metrics.conversations_per_min, "conv/min")}</Metric>
        <Metric label="Turnos/min">{formatRate(metrics.turns_per_min, "turnos/min")}</Metric>
        <Metric label="Duración">{formatDuration(metrics.duration_ms)}</Metric>
      </dl>

      {run.kind === "stress" && metrics.queue_depth_samples.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground">
            Cola bajo carga · {metrics.queue_depth_samples.length}{" "}
            {metrics.queue_depth_samples.length === 1 ? "muestra" : "muestras"}
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-muted/50 p-3 font-mono text-xs">
            {JSON.stringify(metrics.queue_depth_samples, null, 2)}
          </pre>
        </details>
      )}
    </section>
  );
}
