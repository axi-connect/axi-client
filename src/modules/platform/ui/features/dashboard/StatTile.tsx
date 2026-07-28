/**
 * Tile de KPI del dashboard: label + valor tabular + icono opcional.
 * Los valores se DERIVAN en cliente de los GETs de lista — no hay endpoints
 * de agregados de negocio y no se inventan métricas (spec §5.1).
 */
import type { LucideIcon } from "lucide-react";
import { cn } from "@/core/lib/utils";

type StatTileProps = {
  label: string;
  value: number | string | null;
  icon?: LucideIcon;
  /** Acento del valor (p.ej. warning para alertas activas > 0). */
  tone?: "default" | "warning";
  className?: string;
};

export function StatTile({ label, value, icon: Icon, tone = "default", className }: StatTileProps) {
  return (
    <div className={cn("rounded-2xl border border-border bg-background p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon && <Icon aria-hidden="true" className="size-4 text-muted-foreground" />}
      </div>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          tone === "warning" && "text-warning",
        )}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}
