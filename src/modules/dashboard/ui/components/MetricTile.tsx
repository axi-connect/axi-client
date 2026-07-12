"use client";

import { cn } from "@/core/lib/utils";

/**
 * Tile de métrica del dashboard (patrón de OrderStatsTiles): card sólida con
 * icono en chip + label + valor tabular. Jerarquía por peso/tamaño, no color
 * (DESIGN §4). `alert` resalta el chip cuando el dato requiere atención.
 */
export function MetricTile({
  label,
  value,
  icon,
  hint,
  alert,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  hint?: string;
  alert?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4">
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          alert ? "bg-warning/15 text-warning" : "bg-secondary text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-2xl font-semibold tabular-nums">{value}</p>
        {hint !== undefined && (
          <p className="truncate text-xs text-muted-foreground">{hint}</p>
        )}
      </div>
    </div>
  );
}

/** Contenedor de sección (card sólida) con título y contenido. */
export function DashboardCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-2xl border border-border bg-background p-5", className)}
    >
      <header className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

/** Estado vacío interno de una card (icono + frase + acción sugerida). */
export function CardEmpty({
  icon,
  message,
}: {
  icon: React.ReactNode;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <span className="text-muted-foreground">{icon}</span>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
