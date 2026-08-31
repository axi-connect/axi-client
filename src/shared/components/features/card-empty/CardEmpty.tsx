import type { GlyphKind } from "@/shared/components/ui/glyphs";
import { GlassGlyph } from "@/shared/components/ui/glyphs";

type CardEmptyBase = { message: string };

/** Los dos materiales de ilustración (DESIGN-SYSTEM §7), como en `EmptyState`. */
type CardEmptyProps = CardEmptyBase &
  (
    | { icon: React.ReactNode; glyph?: never }
    | { glyph: GlyphKind; icon?: never }
  );

/**
 * Estado vacío **interno de una card**: solo ilustración + frase, sin título ni
 * acción. Es el hermano pequeño de `EmptyState`, para cuando la card ya tiene su
 * propio encabezado y una segunda cabecera sobraría.
 *
 * Vivía en `modules/dashboard/ui/components/MetricTile.tsx` y lo consumía
 * `analytics` por ruta interna, que es justo lo que prohíbe la regla 5 de
 * `docs/architecture.md` §3.3. Al ser un primitivo de estado, su sitio es
 * `shared/components/features`.
 *
 * El glifo va a tamaño `md`, el mismo que `EmptyState`, y no al pequeño: su
 * contenedor es una card entera, no un rail ni un popover. El pequeño se reserva
 * para los sitios de verdad estrechos —el sidebar de canales, la lista del
 * inbox, el panel de notificaciones, el rail de adjuntos—, donde 96 px no cabe.
 */
export function CardEmpty({ icon, glyph, message }: CardEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      {glyph ? (
        <GlassGlyph kind={glyph} tier="md" />
      ) : (
        <span className="text-muted-foreground">{icon}</span>
      )}
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}
