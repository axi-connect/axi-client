"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Leer un texto en voz alta con la voz del navegador (`speechSynthesis`).
 *
 * Es el «Escuchar la pregunta» de la entrevista de Alba y el «Escuchar» del
 * resumen de Axel (plan island_live_plan.md, decisión D3 del dueño: voz del
 * navegador, cero backend). El informe de la entrevista lo pide con estas
 * palabras: «reproducción y pausa, manteniendo el texto visible». Cuatro
 * decisiones:
 *
 * 1. **Un solo hablante en toda la página.** El sintetizador es global: si la
 *    isla y la burbuja tuvieran cada una su estado, una se quedaría «sonando»
 *    cuando la otra la corta. El estado vive en un almacén de módulo y cada
 *    botón lee si la que suena es SU clave.
 * 2. **Pausa de verdad.** El mismo botón pausa y sigue (`pause`/`resume`),
 *    no vuelve a empezar desde el principio.
 * 3. **Por frases.** Chrome corta una lectura larga a los ~15 s sin avisar
 *    (`onend` nunca llega y el botón se quedaba en «Pausar»). Cada frase es un
 *    enunciado propio en la cola del sintetizador; el último cierra.
 * 4. **Sin soporte no hay botón**, y se calla al ocultar la pestaña o al
 *    desmontarse el último que escuchaba.
 */

export type SpeechState = "idle" | "speaking" | "paused";

interface SpeechSnapshot {
  /** La clave del texto que suena (o está en pausa), o `null`. */
  key: string | null;
  state: SpeechState;
}

const IDLE: SpeechSnapshot = { key: null, state: "idle" };
let snapshot: SpeechSnapshot = IDLE;
const listeners = new Set<() => void>();
/** Cada lectura tiene su número: el `onend` tardío de una lectura cortada no apaga la nueva. */
let run = 0;

function emit(next: SpeechSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => {
    listener();
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onHidden);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onHidden);
      stopSpeaking();
    }
  };
}

function onHidden() {
  if (document.visibilityState === "hidden") stopSpeaking();
}

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

/** La voz en español que el navegador tenga; si no hay, la de por defecto con `lang` español. */
function spanishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => /^es[-_]CO/i.test(voice.lang)) ?? voices.find((voice) => /^es/i.test(voice.lang));
}

/** Frases: el punto, la interrogación o la exclamación cierran una; los saltos de línea también. */
export function speechChunks(text: string): string[] {
  // Sin lookbehind a propósito: un literal de regex no se transpila, y en un
  // navegador sin él el módulo entero no parsearía (y con él, el chat).
  return text
    .split(/\n+/)
    .flatMap((line) => line.match(/[^.!?…]+[.!?…]*/g) ?? [])
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

export function stopSpeaking() {
  run += 1;
  if (speechSupported()) window.speechSynthesis.cancel();
  if (snapshot.key !== null) emit(IDLE);
}

function speak(key: string, text: string) {
  const chunks = speechChunks(text);
  if (!speechSupported() || chunks.length === 0) return;
  const synth = window.speechSynthesis;
  // `cancel()` y `speak()` en la misma vuelta dejan mudo a Chrome cuando algo
  // sonaba: si había lectura en curso, la nueva arranca en la vuelta siguiente.
  const busy = synth.speaking || synth.pending;
  synth.cancel();
  run += 1;
  const mine = run;
  const voice = spanishVoice();
  const go = () => {
    if (run !== mine) return;
    chunks.forEach((chunk, index) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = "es-CO";
      if (voice !== undefined) utterance.voice = voice;
      const last = index === chunks.length - 1;
      utterance.onend = () => {
        if (last && run === mine) emit(IDLE);
      };
      utterance.onerror = () => {
        if (run === mine) emit(IDLE);
      };
      synth.speak(utterance);
    });
  };
  if (busy) setTimeout(go, 0);
  else go();
  emit({ key, state: "speaking" });
}

export interface Speech {
  /** El navegador puede leer en voz alta. Falso en el servidor. */
  supported: boolean;
  /** Qué hace ESTA clave: callada, leyendo o en pausa. */
  state: SpeechState;
  /** Lee, pausa o sigue, según el estado (el mismo botón hace las tres cosas). */
  toggle: (text: string) => void;
}

/**
 * @param key Identidad del texto (el id de la pregunta o del resumen): dos
 *   botones con la misma clave se ven sonando a la vez, porque leen lo mismo.
 */
export function useSpeech(key: string): Speech {
  const current = useSyncExternalStore(subscribe, () => snapshot, () => IDLE);
  const supported = useSyncExternalStore(subscribe, speechSupported, () => false);
  const state: SpeechState = current.key === key ? current.state : "idle";
  const toggle = useCallback(
    (text: string) => {
      if (snapshot.key !== key) {
        speak(key, text);
        return;
      }
      if (snapshot.state === "speaking") {
        window.speechSynthesis.pause();
        emit({ key, state: "paused" });
      } else {
        window.speechSynthesis.resume();
        emit({ key, state: "speaking" });
      }
    },
    [key],
  );
  return { supported, state, toggle };
}
