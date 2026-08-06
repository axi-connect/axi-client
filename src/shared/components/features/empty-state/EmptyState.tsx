import type { LucideIcon } from "lucide-react";
import { cn } from "@/core/lib/utils";

/** Acento del icono. Cada módulo usa el suyo (DESIGN §3.1: una vista lleva
 *  coral + UN acento secundario, nunca violeta y ámbar a la vez). */
export type EmptyStateAccent = "violet" | "amber" | "brand" | "muted";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** CTA sugerida (botón/link ya construido por la vista). */
  action?: React.ReactNode;
  accent?: EmptyStateAccent;
  /** `dashed` (default) para "aún no hay nada"; `solid` cuando el vacío es un
   *  resultado legítimo de un filtro y la caja convive con contenido sólido. */
  variant?: "dashed" | "solid";
  className?: string;
};

const ACCENT_CLASSES: Record<EmptyStateAccent, { bg: string; fg: string }> = {
  violet: { bg: "bg-accent-violet/10", fg: "text-accent-violet" },
  amber: { bg: "bg-accent-amber/10", fg: "text-accent-amber" },
  brand: { bg: "bg-accent", fg: "text-brand" },
  muted: { bg: "bg-muted", fg: "text-muted-foreground" },
};

/**
 * Estado vacío estándar: icono + frase + acción sugerida (patrón obligatorio de
 * DESIGN-SYSTEM §9). Distinguir siempre "aún no hay nada" (con CTA de creación)
 * de "no hay resultados" (con CTA de limpiar filtros): son mensajes distintos.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  accent = "violet",
  variant = "dashed",
  className,
}: EmptyStateProps) {
  const tone = ACCENT_CLASSES[accent];
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-border px-6 py-16 text-center",
        variant === "dashed" ? "border-dashed" : "bg-background",
        className,
      )}
    >
      <span className={cn("flex size-12 items-center justify-center rounded-full", tone.bg)}>
        <Icon aria-hidden="true" className={cn("size-6", tone.fg)} />
      </span>
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
