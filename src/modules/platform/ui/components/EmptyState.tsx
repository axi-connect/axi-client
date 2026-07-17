import type { LucideIcon } from "lucide-react";
import { cn } from "@/core/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** CTA sugerida (botón/link ya construido por la vista). */
  action?: React.ReactNode;
  className?: string;
};

/**
 * Estado vacío estándar del panel de plataforma: icono en línea + frase +
 * acción sugerida (patrón obligatorio de DESIGN-SYSTEM §9). También cubre los
 * stubs de secciones en FE1 y los "sin configurar" (p.ej. DB dedicada 404).
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border px-6 py-16 text-center", className)}>
      <span className="flex size-12 items-center justify-center rounded-full bg-accent-violet/10">
        <Icon aria-hidden="true" className="size-6 text-accent-violet" />
      </span>
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
