/**
 * Los recorridos de UI real de `/overview` (axi-video/03-producciones/2026-11-overview-recorridos).
 *
 * Viven en Cloudinary, como los videos de la landing: cero carga y cero ancho de banda sobre el VPS de Axi. Se sube
 * SOLO el MP4 de cada clip (`overview/<formato>/<clip>`); el WebM y el póster los genera Cloudinary por URL.
 *   · pantalla: 1920×1200 (16:10, la captura de escritorio con cámara)
 *   · celular: 1080×1350 (4:5, el teléfono completo con su fondo; en la página va sin marco)
 * El póster es el encuadre FINAL, el legible: es lo que ve quien pide menos movimiento.
 */
export type ClipId =
  | "gancho"
  | "responde"
  | "vende"
  | "control"
  | "equipo"
  | "un-lugar"
  | "clientes"
  | "seguimiento"
  | "llamadas"
  | "recupera"
  | "busca"
  | "meta";

export type ClipFormat = "pantalla" | "celular";

/** Duración de cada clip en segundos (la del render, `clips.js` de la producción). */
export const CLIP_DURATIONS: Readonly<Record<ClipId, number>> = {
  gancho: 7.5,
  responde: 9,
  vende: 9,
  control: 8,
  equipo: 9,
  "un-lugar": 7,
  clientes: 8,
  seguimiento: 8,
  llamadas: 9,
  recupera: 8,
  busca: 8,
  meta: 9,
};

export const CLOUDINARY_VIDEO_BASE = "https://res.cloudinary.com/dpfnxj52w/video/upload";
export const CLIP_FOLDER = "overview";

export type ClipSources = { readonly mp4: string; readonly webm: string; readonly poster: string };

/** Ancho del póster: el doble de lo que ocupa el medio en una pantalla grande, sin pasar del original. */
const POSTER_WIDTH: Readonly<Record<ClipFormat, number>> = { pantalla: 1600, celular: 900 };

/**
 * URLs de un clip. `base` permite servirlos desde otro origen con la misma estructura de archivos
 * (`<base>/<formato>/<clip>.mp4|.webm|.webp`), por ejemplo en una verificación local.
 */
export function clipSources(clip: ClipId, format: ClipFormat, base?: string | null): ClipSources {
  if (base) {
    const root = `${base.replace(/\/+$/, "")}/${format}/${clip}`;
    return { mp4: `${root}.mp4`, webm: `${root}.webm`, poster: `${root}.webp` };
  }
  const id = `${CLIP_FOLDER}/${format}/${clip}`;
  // El último cuadro: un poco antes del final para no caer fuera del video.
  const end = Math.max(0, CLIP_DURATIONS[clip] - 0.1).toFixed(1);
  return {
    mp4: `${CLOUDINARY_VIDEO_BASE}/${id}.mp4`,
    webm: `${CLOUDINARY_VIDEO_BASE}/vc_vp9,q_auto/${id}.webm`,
    poster: `${CLOUDINARY_VIDEO_BASE}/so_${end},w_${POSTER_WIDTH[format]},f_auto,q_auto/${id}.jpg`,
  };
}
