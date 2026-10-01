/**
 * Los eventos que la película emite en `window` para quien quiera escucharla
 * (la isla de la cabecera, plan §18). La película solo emite; nadie le responde.
 *
 *   window.addEventListener(FILM_CHAPTER_EVENT, (e) => (e as CustomEvent<FilmChapterDetail>).detail)
 *
 * - `film:chapter`: el capítulo del riel y el avance de la película, solo cuando
 *   cambian (el avance, en pasos de 0,01).
 * - `film:activity`: un hecho del negocio de ejemplo para mostrar como aviso
 *   (hoy, el pago de la última cuota en «Cobrar»). Solo con el motor activo.
 */
export const FILM_CHAPTER_EVENT = "film:chapter";
export const FILM_ACTIVITY_EVENT = "film:activity";

export type FilmChapterDetail = {
  /** «Captar», «Vender», «Cobrar», «Crecer», o `null` antes del primero. */
  chapter: string | null;
  /** Índice del capítulo (−1 antes del primero). */
  index: number;
  total: number;
  /** Avance de la película, de 0 a 1, en pasos de 0,01. */
  progress: number;
};

export type FilmActivityDetail = { title: string; detail: string };

export function emitFilmEvent<T>(name: string, detail: T) {
  window.dispatchEvent(new CustomEvent<T>(name, { detail }));
}
