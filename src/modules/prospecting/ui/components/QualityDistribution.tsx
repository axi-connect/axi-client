"use client";

import type { QualitySummaryDTO } from "../../domain/lead";

/**
 * En qué estado está la base.
 *
 * `unscored` va primero y con tratamiento propio: cuando el motor acaba de
 * encenderse ese es el único número real, y una distribución bonita que
 * describe a 12 leads mientras 300 esperan sin mirar es peor que no mostrar
 * nada.
 */
export function QualityDistribution({
  summary,
}: {
  summary: QualitySummaryDTO;
}) {
  const scored =
    summary.verified + summary.risky + summary.invalid + summary.unverified;

  const cells = [
    {
      label: "Verificados",
      value: summary.verified,
      className: "text-success",
    },
    { label: "Con riesgo", value: summary.risky, className: "text-warning" },
    {
      label: "Inválidos",
      value: summary.invalid,
      className: "text-destructive",
    },
    { label: "Sin verificar", value: summary.unverified, className: "" },
  ];

  return (
    <div className="border-border shadow-float bg-background overflow-hidden rounded-lg border">
      <div className="grid grid-cols-2 md:grid-cols-5">
        <div className="bg-accent-violet/[0.05] border-border border-r p-4">
          <p className="text-muted-foreground text-[10.5px] font-semibold tracking-wider uppercase">
            Sin puntuar
          </p>
          <p className="font-heading mt-0.5 text-2xl leading-tight font-bold tabular-nums">
            {summary.unscored}
          </p>
          <p className="text-muted-foreground text-xs">
            {summary.unscored === 0 ? "todo revisado" : "el motor los revisará"}
          </p>
        </div>
        {cells.map((cell) => (
          <div
            key={cell.label}
            className="border-border border-r p-4 last:border-r-0"
          >
            <p className="text-muted-foreground text-[10.5px] font-semibold tracking-wider uppercase">
              {cell.label}
            </p>
            <p
              className={`font-heading mt-0.5 text-2xl leading-tight font-bold tabular-nums ${cell.className}`}
            >
              {cell.value}
            </p>
            <p className="text-muted-foreground text-xs">
              {scored === 0
                ? "—"
                : `${String(Math.round((cell.value / scored) * 100))} %`}
            </p>
          </div>
        ))}
      </div>
      <p className="border-border bg-secondary text-muted-foreground border-t px-4 py-2 text-xs">
        Puntaje promedio de los leads revisados:{" "}
        <strong className="text-foreground font-semibold tabular-nums">
          {summary.average_score}
        </strong>{" "}
        de 100.
      </p>
    </div>
  );
}
