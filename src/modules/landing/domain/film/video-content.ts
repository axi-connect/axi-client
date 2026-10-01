/**
 * El video inmersivo (lienzo «Landing · Video inmersivo», aprobado por la dueña
 * el 2026-10-02): el video del producto, el mismo de /productos, incrustado en la
 * película justo después del hero.
 *
 * Las fuentes son las de /productos (`HERO_VIDEO` en ui/content/productos.content):
 * Cloudinary en streaming progresivo, H.264 a `q_90`, un máster horizontal para
 * escritorio y uno vertical para móvil, cada uno con su póster.
 */

export const FILM_VIDEO = {
  eyebrow: "Axi en acción",
  title: "Así se ve",
  titleThin: "un día con Axi.",
  kicker: "Video del producto",
  caption: "Vende, cobra y atiende. Mientras tú decides.",
  soundOn: "Activar sonido",
  soundOff: "Silenciar",
  play: "Reproducir el video",
  label: "Video del producto Axi Connect en acción",
} as const;
