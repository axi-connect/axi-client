import type { LucideIcon } from "lucide-react";
import { cn } from "@/core/lib/utils";

/** Acento del VALOR. `amber` marca dinero recuperado en marketing; `warning`
 *  marca una cifra que pide atención. El resto queda en el color del texto:
 *  el color señala significado, no decora (DESIGN §3.5). */
export type StatTileTone = "default" | "warning" | "amber" | "success" | "destructive";

type StatTileProps = {
  label: string;
  value: number | string | null;
  icon?: LucideIcon;
  tone?: StatTileTone;
  /** Segunda línea: de dónde sale la cifra o qué la matiza. */
  hint?: React.ReactNode;
  className?: string;
};

const TONE_CLASSES: Record<StatTileTone, string> = {
  default: "",
  warning: "text-warning",
  amber: "text-accent-amber",
  success: "text-success",
  destructive: "text-destructive",
};

/**
 * Tile de KPI: etiqueta en versalitas + valor tabular + icono opcional.
 * `null` se pinta como "—": una métrica que aún no se ha cargado no es un cero.
 */
export function StatTile({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
  className,
}: StatTileProps) {
  return (
    <div className={cn("rounded-2xl border border-border bg-background p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon && <Icon aria-hidden="true" className="size-4 text-muted-foreground" />}
      </div>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", TONE_CLASSES[tone])}>
        {value ?? "—"}
      </p>
      {hint !== undefined && hint !== null && (
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
