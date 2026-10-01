/**
 * El video inmersivo (lienzo «Landing · Video inmersivo», aprobado por la dueña
 * el 2026-10-02), justo después del hero. El video es el de la home que dio la
 * dueña el 2026-10-02 («este es el que debe quedar»): «adelante-web-vista-previa»,
 * 1920×1080, 1:43, fondo de tinta como la película.
 *
 * Cloudinary en streaming progresivo (HTTP range). Escritorio: el original sin
 * re-codificar (ya es H.264 a ~1,8 Mbps; pasarlo por `q_90` solo perdería una
 * generación). Móvil: el mismo máster a 1080 de ancho (~0,7 Mbps). Se ve
 * entero (`contain`): el fondo negro del video se funde con la tinta, así que
 * no hay franjas y no se recorta su texto.
 */
const CLOUDINARY_VIDEO = "https://res.cloudinary.com/dpfnxj52w/video/upload";
const ID = "adelante-web-vista-previa_tbvxlp";
/** El fotograma 2 s: «Los clientes ya no entran por la puerta.» */
const poster = (w: number) => `${CLOUDINARY_VIDEO}/so_2,q_85,f_jpg,w_${w}/${ID}.jpg`;

export const FILM_VIDEO_SOURCES = {
  desktop: { mp4: `${CLOUDINARY_VIDEO}/v1790871512/${ID}.mp4`, poster: poster(1920) },
  mobile: { mp4: `${CLOUDINARY_VIDEO}/vc_h264,q_90,w_1080/${ID}.mp4`, poster: poster(1080) },
} as const;

export const FILM_VIDEO = {
  eyebrow: "Axi en acción",
  title: "Así se ve",
  titleThin: "un día con Axi.",
  kicker: "Video del producto",
  caption: "Vende, cobra y atiende. Mientras tú decides.",
  soundOn: "Activar sonido",
  soundOff: "Silenciar",
  play: "Reproducir el video",
  label: "Video de Axi Connect: de la conversación a la venta",
} as const;
