import type { ReactNode } from "react";

import { FILM_CONTENT, type FilmContent } from "@/modules/landing/domain/film/film-content";
import { FILM_NICHES, type FilmNiche } from "@/modules/landing/domain/film/niches";

/**
 * Pinta las cuatro variantes de un fragmento, una por nicho. El atributo
 * `data-niche` de la película decide cuál se ve (film.css), así que cambiar de
 * nicho no hidrata ni vuelve a renderizar las escenas: son Server Components.
 *
 * `display: contents` hace que la envoltura no exista para el layout: la
 * variante visible se comporta como si fuera hija directa de su contenedor.
 */
export function ByNiche({
  children,
  as: Tag = "div",
}: {
  children: (content: FilmContent, niche: FilmNiche) => ReactNode;
  /** `span` dentro de texto (un `<div>` no puede vivir en un `<p>`). */
  as?: "div" | "span";
}) {
  return (
    <>
      {FILM_NICHES.map((niche) => (
        <Tag key={niche} data-only={niche} className="contents">
          {children(FILM_CONTENT[niche], niche)}
        </Tag>
      ))}
    </>
  );
}
