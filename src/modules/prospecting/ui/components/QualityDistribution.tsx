"use client";

import { cn } from "@/core/lib/utils";

import type { QualitySummaryDTO } from "../../domain/lead";

const n = (value: number) => value.toLocaleString("es-CO");

/**
 * En qué estado está la base.
 *
 * `unscored` va primero y con tratamiento propio: cuando el motor acaba de
 * encenderse ese es el único número real, y una distribución bonita que
 * describe a 12 leads mientras 300 esperan sin mirar es peor que no mostrar
 * nada.
 *
 * Una tarjeta `@container`: ancha, las cinco cifras en fila; estrecha, en dos columnas.
 */
export function QualityDistribution({ summary }: { summary: QualitySummaryDTO }) {
  const scored = summary.verified + summary.risky + summary.invalid + summary.unverified;
  const pct = (value: number) => (scored === 0 ? "—" : `${String(Math.round((value / scored) * 100))} % de los puntuados`);

  const cells = [
    { label: "Verificados", value: summary.verified, className: "text-success" },
    { label: "Con riesgo", value: summary.risky, className: "text-warning" },
    { label: "Inválidos", value: summary.invalid, className: "text-destructive" },
    { label: "Sin verificar", value: summary.unverified, className: "" },
  ];

  return (
    <section aria-label="Calidad de tus leads" className="border-border bg-card @container min-w-0 overflow-hidden rounded-3xl border">
      {/* Separadores de 1 px con el hueco de la rejilla: salen bien en 2 y en 5 columnas sin bordes sueltos. */}
      <div className="bg-border grid grid-cols-2 gap-px @3xl:grid-cols-5">
        <Cell
          label="Sin puntuar"
          value={summary.unscored}
          hint={summary.unscored === 0 ? "todo revisado" : "el motor los revisará"}
          tinted
          className="col-span-2 @3xl:col-span-1"
          valueClassName="text-accent-violet"
        />
        {cells.map((cell) => (
          <Cell key={cell.label} label={cell.label} value={cell.value} hint={pct(cell.value)} valueClassName={cell.className} />
        ))}
      </div>
      <p className="border-border text-muted-foreground border-t px-5 py-3 text-xs">
        Puntaje promedio de los leads revisados:{" "}
        <strong className="text-foreground font-semibold tabular-nums">{summary.average_score}</strong> de 100.
      </p>
    </section>
  );
}

function Cell({
  label,
  value,
  hint,
  tinted = false,
  className,
  valueClassName,
}: {
  label: string;
  value: number;
  hint: string;
  tinted?: boolean;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn("bg-card min-w-0", className)}>
      <div className={cn("flex h-full flex-col gap-1.5 p-5", tinted && "bg-accent-violet/[0.05]")}>
        <span className="text-muted-foreground text-xs">{label}</span>
        <span className={cn("font-heading text-[2rem] leading-none font-bold tracking-tight tabular-nums", valueClassName)}>{n(value)}</span>
        <span className="text-muted-foreground text-xs">{hint}</span>
      </div>
    </div>
  );
}
