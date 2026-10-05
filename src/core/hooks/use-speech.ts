"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Leer un texto en voz alta con la voz del navegador (`speechSynthesis`).
 *
 * Es el «Escuchar la pregunta» de la entrevista de Alba y el «Escuchar» del
 * resumen de Axel (plan island_live_plan.md, decisión D3 del dueño: voz del
 * navegador, cero backend). Tres decisiones:
 *
 * 1. **Un solo hablante en toda la página.** El sintetizador es global: si la
 *    isla y la burbuja tuvieran cada una su estado, una se quedaría «sonando»
 *    cuando la otra la corta. El estado vive en un almacén de módulo y cada
 *    botón lee si la que suena es SU clave.
 * 2. **Sin soporte no hay botón**, igual que el micrófono: `supported` es falso
 *    en el servidor y en navegadores sin la API, y quien pinta el botón lo
 *    esconde. El texto sigue en pantalla siempre.
 * 3. **Se calla al ocultar la pestaña** y al desmontar quien hablaba: una voz
 *    que sigue leyendo desde una pestaña escondida es un susto.
 */

interface SpeechSnapshot {
  /** La clave del texto que suena ahora, o `null`. */
  speaking: string | null;
}

let snapshot: SpeechSnapshot = { speaking: null };
const listeners = new Set<() => void>();

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

const SERVER_SNAPSHOT: SpeechSnapshot = { speaking: null };

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

/** La voz en español que el navegador tenga; si no hay, la de por defecto con `lang` español. */
function spanishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => /^es[-_]CO/i.test(voice.lang)) ?? voices.find((voice) => /^es/i.test(voice.lang));
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel();
  if (snapshot.speaking !== null) emit({ speaking: null });
}

function speak(key: string, text: string) {
  if (!speechSupported() || text.trim() === "") return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-CO";
  const voice = spanishVoice();
  if (voice !== undefined) utterance.voice = voice;
  const done = () => {
    // Solo la que sigue sonando limpia: un `cancel` por otra lectura dispara el
    // `onend` de la anterior DESPUÉS de que la nueva ya tomó la clave.
    if (snapshot.speaking === key) emit({ speaking: null });
  };
  utterance.onend = done;
  utterance.onerror = done;
  emit({ speaking: key });
  synth.speak(utterance);
}

export interface Speech {
  /** El navegador puede leer en voz alta. Falso en el servidor. */
  supported: boolean;
  /** Esta clave es la que suena ahora. */
  speaking: boolean;
  /** Lee el texto, o lo calla si ya sonaba (el mismo botón hace las dos cosas). */
  toggle: (text: string) => void;
}

/**
 * @param key Identidad del texto (el id de la pregunta o del resumen): dos
 *   botones con la misma clave se ven sonando a la vez, porque leen lo mismo.
 */
export function useSpeech(key: string): Speech {
  const state = useSyncExternalStore(subscribe, () => snapshot, () => SERVER_SNAPSHOT);
  const supported = useSyncExternalStore(subscribe, speechSupported, () => false);
  const speaking = state.speaking === key;
  const toggle = useCallback(
    (text: string) => {
      if (snapshot.speaking === key) stopSpeaking();
      else speak(key, text);
    },
    [key],
  );
  return { supported, speaking, toggle };
}
