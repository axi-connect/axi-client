/**
 * Escucha la llamada (plan §20, lienzo v4 aprobado por la dueña el 2026-10-01):
 * una entrante de ejemplo que el visitante reproduce en la escena de llamada.
 *
 * Todo lo que se sincroniza con la voz sale del audio real, medido con ffmpeg
 * sobre `public/assets/audio/*.mp3` (no se dibuja a mano):
 * - `CALL_PEAKS`: la envolvente RMS por barra (~62 ms), normalizada con
 *   exponente 0,6 para que las sílabas suaves se vean;
 * - `CALL_PHRASES`: los tramos con voz (silencios de más de 240 ms), con su texto.
 * Las palabras se reparten dentro de su tramo por su largo (`callWords`), así los
 * subtítulos se encienden con la voz sin un motor de alineación.
 *
 * Límites (§19.6): las notas no nombran un canal de envío.
 */

export { CALL_COPY, CALL_START, CALL_TOTAL, CALL_TRACKS, callClock, type CallTrack } from "./call-time";
import { CALL_START, type CallTrack } from "./call-time";

/** Envolvente de la onda: 77 barras del cliente y 125 de Axi, en [0, 1]. */
export const CALL_PEAKS: readonly [readonly number[], readonly number[]] = [
  [
    0.01, 0.14, 0.75, 0.86, 0.64, 0.9, 0.62, 0.49, 0.29, 0.12, 0.05, 0.02, 0.02, 0.02, 0.02, 0.02,
    0.02, 0.22, 0.56, 0.75, 1, 0.75, 0.65, 0.78, 0.81, 0.9, 0.64, 0.71, 0.97, 0.7, 0.75, 0.76, 0.85,
    0.58, 0.86, 0.56, 0.7, 0.69, 0.77, 0.71, 0.71, 0.89, 0.42, 0.62, 0.56, 0.43, 0.21, 0.5, 0.46,
    0.5, 0.6, 0.4, 0.21, 0.21, 0.12, 0.03, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.04, 0.66, 0.79,
    0.69, 0.74, 0.74, 0.86, 0.18, 0.23, 0.6, 0.45, 0.48, 0.46, 0.3, 0,
  ],
  [
    0.04, 0.98, 0.89, 0.82, 0.78, 0.26, 0.71, 0.54, 0.01, 0.51, 0.97, 0.83, 0.61, 0.58, 0.36, 0.15,
    0, 0, 0, 0.01, 0.81, 0.94, 0.82, 0.7, 0.66, 0.63, 0.76, 0.38, 0.15, 0.75, 0.82, 0.83, 0.86, 0.87,
    0.81, 0.53, 0.1, 0.29, 1, 0.68, 0.01, 0.3, 0.43, 0.31, 0.04, 0.03, 0.01, 0, 0.05, 0.08, 0.93,
    0.95, 0.89, 0.83, 0.47, 0.18, 0.59, 0.7, 0.58, 0.74, 0.66, 0.71, 0.76, 0.88, 0.78, 0.33, 0.09,
    0.83, 0.9, 0.82, 0.24, 0.79, 0.7, 0.69, 0.79, 0.67, 0.58, 0.52, 0.78, 0.73, 0.72, 0.75, 0.68,
    0.37, 0.59, 0.83, 0.87, 0.71, 0.51, 0.48, 0.55, 0.48, 0.09, 0.03, 0, 0.01, 0.84, 0.71, 0.29,
    0.84, 0.52, 0.56, 0.73, 0.76, 0.38, 0.34, 0.84, 0.66, 0.03, 0.76, 0.6, 0.13, 0.64, 0.99, 0.78,
    0.49, 0.02, 0.76, 0.94, 0.66, 0.21, 0.13, 0.52, 0.37, 0.02,
  ],
];

/** Tramos con voz de cada pista: [desde, hasta, texto], en segundos de la pista. */
export const CALL_PHRASES: readonly [readonly (readonly [number, number, string])[], readonly (readonly [number, number, string])[]] = [
  [
    [0.12, 0.54, "Hola, buenas."],
    [1.1, 3.36, "Oye, vi en el reel unas gafas negras, de lente naranja…"],
    [3.94, 4.72, "¿Todavía las tienen?"],
  ],
  [
    [0.06, 0.96, "¡Hola! Sí, claro."],
    [1.28, 2.74, "Todavía nos quedan unas pocas."],
    [3.14, 5.78, "Son las Aviador Ámbar: montura negra, lente ámbar."],
    [6.04, 7.78, "Te paso la foto y el precio."],
  ],
];

export type CallWord = { word: string; at: number };

/** Cada palabra con el segundo (de su pista) en que se enciende: reparto por letras + 1. */
export function callWords(track: CallTrack): CallWord[] {
  return CALL_PHRASES[track].flatMap(([from, to, text]) => {
    const words = text.split(" ");
    const weights = words.map((w) => w.replace(/[^\p{L}]/gu, "").length + 1);
    const total = weights.reduce((a, b) => a + b, 0);
    let acc = 0;
    return words.map((word, i) => {
      const at = from + ((to - from) * acc) / total;
      acc += weights[i];
      return { word, at };
    });
  });
}

export const CALL_WORDS: readonly [CallWord[], CallWord[]] = [callWords(0), callWords(1)];

/** Cuántas palabras de la pista ya sonaron en el segundo `local` de esa pista. */
export function litCount(track: CallTrack, local: number): number {
  let n = 0;
  for (const w of CALL_WORDS[track]) if (w.at <= local) n++;
  return n;
}

/** Las etapas de esta llamada, en segundos de la llamada (no de la pista). */
export const CALL_STAGES: readonly (readonly [string, number])[] = [
  ["Apertura", 0],
  ["Motivo", 1.1],
  ["Propuesta", CALL_START[1] + 3.14],
  ["Cierre", CALL_START[1] + 6.04],
];

/** Lo que Axi anota, y el segundo de la llamada en que ya lo sabe. */
export const CALL_NOTES: readonly (readonly [string, string, number])[] = [
  ["Llegó por", "Un reel", 2.0],
  ["Busca", "Gafas negras, lente naranja", 3.4],
  ["Producto", "Aviador Ámbar · quedan pocas", CALL_START[1] + 5.4],
  ["Siguiente paso", "Enviar foto y precio", CALL_START[1] + 7.6],
];
