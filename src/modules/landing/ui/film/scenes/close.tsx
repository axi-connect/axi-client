import "../film-tanda4.css";

import { MessageCircle } from "lucide-react";

import { salesWhatsAppUrl } from "@/core/config/env";
import { FILM_CLOSE } from "@/modules/landing/domain/film/tanda4-content";
import { WA_MESSAGES } from "@/modules/landing/ui/content/landing.content";
import { ByNiche } from "@/modules/landing/ui/film/parts/ByNiche";
import { FilmCta } from "@/modules/landing/ui/film/parts/FilmCta";
import { BrandMark } from "@/shared/components/ui/brand-mark";

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();

const firstName = (name: string) => name.split(/\s+/)[0] ?? name;

/**
 * El cierre (plan §16.4): el único momento de color pleno. El isotipo se
 * dibuja con un trazo blanco, se llena con sus tres cintas y florece; debajo,
 * el siguiente cliente del nicho ya está escribiendo.
 *
 * El HTML es el fotograma final (isotipo lleno, halo abierto, todo visible):
 * el motor (`engine/close-scene.ts`) decide desde dónde llega cada pieza.
 * El cliente que escribe es el de la escena del equipo de cada nicho.
 */
export function CloseScene() {
  return (
    <section id="demo" data-scene="close" aria-labelledby="cierre-h" className="film-scene film-close">
      <div className="film-close-stage">
        <div className="film-close-mark" aria-hidden="true">
          <div data-anim="close-bloom" className="film-close-bloom" />
          <div data-anim="close-mark" className="film-close-iso">
            <BrandMark className="size-full" />
          </div>
        </div>

        <h2 id="cierre-h" className="film-h film-close-h">
          <span data-anim="close-l1" className="block">
            {FILM_CLOSE.title}
          </span>{" "}
          <span data-anim="close-l2" className="t block">
            {FILM_CLOSE.titleThin}
          </span>
        </h2>

        <div data-anim="close-typing" className="film-close-typing" aria-hidden="true">
          <ByNiche as="span">
            {(c) => (
              <>
                <span className="film-close-avatar">{initialsOf(c.team.customer)}</span>
                {FILM_CLOSE.typing(firstName(c.team.customer))}
              </>
            )}
          </ByNiche>
          <span className="film-close-dots">
            <i data-anim="close-dot" />
            <i data-anim="close-dot" />
            <i data-anim="close-dot" />
          </span>
        </div>

        <div data-anim="close-ctas" className="film-close-ctas">
          <div className="film-close-buttons">
            <FilmCta className="film-close-cta">{FILM_CLOSE.cta}</FilmCta>
            <a className="film-close-agent" href={salesWhatsAppUrl(WA_MESSAGES.finalCta)} target="_blank" rel="noopener noreferrer">
              <MessageCircle aria-hidden="true" className="size-[17px]" strokeWidth={2} />
              {FILM_CLOSE.agent}
            </a>
          </div>
          <p className="film-close-micro">{FILM_CLOSE.micro}</p>
        </div>
      </div>
    </section>
  );
}
