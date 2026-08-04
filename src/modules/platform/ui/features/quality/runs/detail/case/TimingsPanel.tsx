/**
 * Latencia extremo a extremo por turno (`timings` es Json opaco → parser
 * defensivo del dominio). Semáforo de `thresholds.ts`; turnos sin respuesta
 * (timeout/corte) muestran "—".
 */
import { parseCaseTimings } from "../../../../../../domain/quality-runs";
import { latencyTone } from "../../../../../../domain/thresholds";
import { formatLatency } from "../../../../analytics/analytics-format";
import { MetricCell } from "../../../../analytics/MetricCell";

const TIME = new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function TimingsPanel({ timings }: { timings: unknown }) {
  const parsed = parseCaseTimings(timings);

  if (parsed.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin latencias medidas.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-muted-foreground">
          <th className="py-1 font-medium">Turno</th>
          <th className="py-1 font-medium">Inyectado</th>
          <th className="py-1 text-right font-medium">e2e</th>
        </tr>
      </thead>
      <tbody>
        {parsed.map((timing) => (
          <tr key={timing.turn} className="border-t border-border">
            <td className="py-1.5 tabular-nums">{timing.turn}</td>
            <td className="py-1.5 text-muted-foreground tabular-nums">
              {timing.injected_at ? TIME.format(new Date(timing.injected_at)) : "—"}
            </td>
            <td className="py-1.5 text-right">
              <MetricCell tone={latencyTone(timing.e2e_ms)}>{formatLatency(timing.e2e_ms)}</MetricCell>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
