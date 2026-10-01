/**
 * Lo mínimo de «Escucha la llamada» (plan §20) que necesita el reproductor en el
 * navegador: las pistas, sus tiempos, los textos que cambian y el reloj. Los
 * datos medidos (onda, tramos, palabras) viven en `call-audio.ts` y solo los usa
 * el servidor, que pinta la escena.
 */

/** Las dos pistas: el cliente pregunta y Axi contesta. */
export const CALL_TRACKS = [
  { who: "Cliente", src: "/assets/audio/cliente-gafas.mp3", duration: 4.81 },
  { who: "Axi", src: "/assets/audio/agente-aviador.mp3", duration: 7.84 },
] as const;

export type CallTrack = 0 | 1;

/** Dónde empieza cada pista en el tiempo de la llamada. */
export const CALL_START = [0, CALL_TRACKS[0].duration] as const;
export const CALL_TOTAL = CALL_TRACKS[0].duration + CALL_TRACKS[1].duration;

export const CALL_COPY = {
  eyebrow: "Vender · Llamadas",
  title: "Y cuando hay que llamar, llama.",
  titleThin: "Y si te llaman, contesta.",
  lead: "Retoma cotizaciones, confirma citas y atiende las entrantes: lleva cada llamada por etapas y, si no puede atender, toma el recado.",
  live: "Llamada entrante",
  sample: "audio de ejemplo",
  notes: "Lo que Axi anota",
  intro: "Alguien vio un reel y llama a preguntar por unas gafas. Toca la esfera y escucha cómo contesta Axi.",
  timeline: "Línea de tiempo de la llamada",
  play: "Escuchar la llamada",
  pause: "Pausar la llamada",
  again: "Escuchar otra vez",
  status: {
    ready: "Lista para escuchar",
    paused: "En pausa",
    client: "Habla el cliente",
    axi: "Contesta Axi",
    done: "Llamada atendida",
  },
} as const;

/** «0:04»: la llamada dura menos de un minuto. */
export const callClock = (seconds: number) => `0:${String(Math.floor(Math.max(0, seconds))).padStart(2, "0")}`;
