import type { ReactNode } from "react";

import type { ScreenTone } from "@/modules/landing/ui/content/productos.content";

/**
 * Las piezas sueltas con que se recrea el panel: la píldora de estado
 * (`StatePill`), el avatar de iniciales y la etiqueta en versalitas
 * (`Kicker`). Imitan las del panel real sin importarlas: la landing no
 * arrastra el bundle del panel.
 */
export function Pill({ tone = "muted", children }: { tone?: ScreenTone; children: ReactNode }) {
  return (
    <span className="pp-pill" data-tone={tone === "muted" ? undefined : tone}>
      {children}
    </span>
  );
}

export function Initials({ children }: { children: string }) {
  return (
    <span className="pp-av" aria-hidden="true">
      {children}
    </span>
  );
}

export function Kicker({ children }: { children: ReactNode }) {
  return <span className="pp-kicker">{children}</span>;
}

/** Un trazo de icono (24×24, stroke). */
export function Glyph({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export const GLYPHS = {
  sparkles: "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z",
  check: "M4 12l5 5L20 6",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
  play: "M7 4v16l13-8z",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
};
