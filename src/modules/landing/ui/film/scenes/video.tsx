import "../film-video.css";

import { FILM_VIDEO } from "@/modules/landing/domain/film/video-content";
import { HERO_VIDEO } from "@/modules/landing/ui/content/productos.content";
import { FilmVideo } from "@/modules/landing/ui/film/parts/FilmVideo";

/**
 * El video inmersivo (plan §23, lienzo aprobado el 2026-10-02). El video del
 * producto entra en su marco bajo el titular
 * y, con la escena fijada, el marco se abre hasta llenar la pantalla
 * (`engine/video-scene.ts`, solo transform y opacity).
 *
 * El marco es la pantalla entera escalada: así abrirlo es un `scale` y no un
 * cambio de tamaño (sin layout ni re-raster). Sin motor, el HTML es el marco
 * con su titular, su frase y su control: todo se lee.
 */
export function VideoScene() {
  return (
    <section id="video" data-scene="video" aria-labelledby="video-h" className="film-scene film-video">
      <div className="film-video-head" data-anim="head">
        <p className="film-eyebrow film-video-dim">{FILM_VIDEO.eyebrow}</p>
        <h2 id="video-h" className="film-h film-video-title">
          {FILM_VIDEO.title}
          <br />
          <span className="t">{FILM_VIDEO.titleThin}</span>
        </h2>
      </div>
      <div className="film-video-frame" data-anim="video-frame">
        <div className="film-video-clip" data-anim="video-clip">
          <FilmVideo desktop={HERO_VIDEO.desktop} mobile={HERO_VIDEO.mobile} />
          <span className="film-video-vignette" data-anim="video-vignette" aria-hidden="true" />
          <p className="film-video-cap" data-anim="video-cap">
            <span className="film-video-kicker">{FILM_VIDEO.kicker}</span>
            <span className="film-video-line">{FILM_VIDEO.caption}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
