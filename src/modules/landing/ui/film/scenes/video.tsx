import "../film-video.css";

import { FILM_VIDEO, FILM_VIDEO_SOURCES } from "@/modules/landing/domain/film/video-content";
import { FilmVideo } from "@/modules/landing/ui/film/parts/FilmVideo";

/**
 * El video inmersivo (plan §23, lienzo aprobado el 2026-10-02). El video de la
 * home entra en su marco bajo el titular
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
        </h2>
      </div>
      <div className="film-video-frame" data-anim="video-frame">
        <div className="film-video-clip" data-anim="video-clip">
          <FilmVideo desktop={FILM_VIDEO_SOURCES.desktop} mobile={FILM_VIDEO_SOURCES.mobile} />
          <span className="film-video-vignette" data-anim="video-vignette" aria-hidden="true" />
          <p className="film-video-cap" data-anim="video-cap">
            <span className="film-video-kicker">{FILM_VIDEO.kicker}</span>
            <span className="film-video-line">{FILM_VIDEO.caption}</span>
          </p>
        </div>
      </div>
      <VideoLight />
    </section>
  );
}

/** Las piezas de una banda del anillo: cuatro filos y cuatro esquinas, en la geometría del marco en reposo. */
const PIECES = ["t", "b", "l", "r", "tl", "tr", "bl", "br"] as const;
/**
 * Las bandas del anillo, de fuera adentro, y la caliente (casi blanca) que
 * enciende el lado brillante del disco: el motor la recorre alrededor del
 * marco con la opacidad de cada pieza (sin máscaras que giren: costaban
 * 17–25 frames de > 50 ms en el tramo, perfil del 2026-10-03).
 */
const BANDS = ["bloom", "corona", "filo", "hot"] as const;

/**
 * La luz del hero que abraza el marco (plan §25). Capas decorativas: sin motor
 * no se ven (salvo el anillo quieto con movimiento reducido, film-video.css) y
 * el motor solo les cambia transform, opacity y el dashoffset de los arcos.
 * - La gota releva al nudo del hero (`.film-hero-knot`) y cae hasta el filo.
 * - El destello anamórfico y los dos arcos son el contacto.
 * - El anillo: tres bandas (filo, corona y bloom) de ocho piezas, para que el
 *   marco crezca sin engordarlas, y una cuarta casi blanca que es el lado
 *   brillante del disco, girando alrededor del marco.
 * - El filamento es la versión de pantallas sin marco animado (< 1024).
 */
function VideoLight() {
  return (
    <div className="film-vlight" aria-hidden="true">
      <div className="film-vlight-ring" data-light="ring" aria-hidden="true">
        {BANDS.map((band) => (
          <div key={band} className={`film-vlight-band film-vlight-${band}`}>
            {PIECES.map((piece) => (
              <i key={piece} className={`film-vlight-${piece}`} data-piece={piece} data-band={band} />
            ))}
          </div>
        ))}
      </div>
      <svg className="film-vlight-arcs" data-light="arcs" aria-hidden="true">
        <path className="film-vlight-arc-glow" data-arc="cw" />
        <path className="film-vlight-arc-glow" data-arc="ccw" />
        <path className="film-vlight-arc-core" data-arc="cw" />
        <path className="film-vlight-arc-core" data-arc="ccw" />
        <path className="film-vlight-arc-head" data-arc="cw" />
        <path className="film-vlight-arc-head" data-arc="ccw" />
      </svg>
      <span className="film-vlight-flash" data-light="flash" aria-hidden="true" />
      <span className="film-vlight-drop" data-light="drop" aria-hidden="true">
        <i className="film-vlight-trail" />
        <i className="film-vlight-core" />
      </span>
      <span className="film-vlight-filament" data-light="filament" aria-hidden="true" />
    </div>
  );
}
