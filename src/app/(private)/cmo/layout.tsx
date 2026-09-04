import type { ReactNode } from "react";

/**
 * Segmento del despacho de Axel.
 *
 * Vive FUERA del grupo `(content)` (que centra a `max-w-7xl` y da el scroll al
 * panel) porque el chat ancla su composer abajo y el rail del tablero tiene su
 * propio scroll: con el scroller del panel, el composer se iría con la página.
 * Es la misma razón por la que el inbox es full-bleed.
 *
 * `@sheet` = el detalle de propuesta como rail derecho interceptado
 * (`/cmo/proposals/[proposalId]`): URL compartible y el back del navegador
 * cierra.
 */
export default function CmoLayout({
  children,
  sheet,
}: {
  children: ReactNode;
  sheet: ReactNode;
}) {
  return (
    <div className="flex min-h-0 w-full flex-1 overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
      {sheet}
    </div>
  );
}
