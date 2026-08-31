import type { LucideIcon } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { GlassGlyph, type GlyphKind } from "@/shared/components/ui/glyphs";

/** Acento del icono. Cada módulo usa el suyo (DESIGN §3.1: una vista lleva
 *  coral + UN acento secundario, nunca violeta y ámbar a la vez). */
export type EmptyStateAccent = "violet" | "amber" | "brand" | "muted";

type EmptyStateBase = {
  title: string;
  description?: string;
  /** CTA sugerida (botón/link ya construido por la vista). */
  action?: React.ReactNode;
  /** `dashed` (default) para "aún no hay nada"; `solid` cuando el vacío es un
   *  resultado legítimo de un filtro y la caja convive con contenido sólido. */
  variant?: "dashed" | "solid";
  className?: string;
};

/**
 * Los dos materiales de ilustración del sistema (DESIGN-SYSTEM §7), en unión
 * discriminada para que sea imposible pedir los dos a la vez:
 *
 * - `icon` — **línea simple**: un icono de `lucide` dentro del disco teñido.
 *   Sigue siendo válido; es lo que usan las llamadas sin migrar.
 * - `glyph` — **cristal ilustrado**: uno de los diez glifos propios. El acento
 *   lo elige la familia del glifo, así que `accent` no aplica.
 */
type EmptyStateProps = EmptyStateBase &
  (
    | { icon: LucideIcon; accent?: EmptyStateAccent; glyph?: never }
    | { glyph: GlyphKind; icon?: never; accent?: never }
  );

const ACCENT_CLASSES: Record<EmptyStateAccent, { bg: string; fg: string }> = {
  violet: { bg: "bg-accent-violet/10", fg: "text-accent-violet" },
  amber: { bg: "bg-accent-amber/10", fg: "text-accent-amber" },
  brand: { bg: "bg-accent", fg: "text-brand" },
  muted: { bg: "bg-muted", fg: "text-muted-foreground" },
};

/**
 * Estado vacío estándar: ilustración + frase + acción sugerida (patrón
 * obligatorio de DESIGN-SYSTEM §9). Distinguir siempre "aún no hay nada" (con
 * CTA de creación) de "no hay resultados" (con CTA de limpiar filtros): son
 * mensajes distintos.
 *
 * **Con `glyph` no se pinta el disco teñido.** No es un olvido: el glifo de
 * cristal ya trae su propio pedestal, y un círculo tintado detrás de un objeto
 * de vidrio se lee como dos platos compitiendo. El acento no se pierde — pasa a
 * alimentar la luz de color interior del glifo.
 *
 * La caja **no lleva `glass-host`**: un estado vacío no es interactivo, y un
 * reflejo que se enciende al pasar por encima de algo que no hace nada promete
 * una interacción inexistente. Esa clase la pone quien sí es hovereable.
 */
export function EmptyState({
  icon: Icon,
  glyph,
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
      {glyph ? (
        <GlassGlyph kind={glyph} tier="md" />
      ) : (
        <span className={cn("flex size-12 items-center justify-center rounded-full", tone.bg)}>
          {Icon && <Icon aria-hidden="true" className={cn("size-6", tone.fg)} />}
        </span>
      )}
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
