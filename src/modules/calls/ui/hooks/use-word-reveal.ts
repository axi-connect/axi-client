"use client";

import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";

export function splitWords(text: string): string[] {
  return text.split(/\s+/).filter((word) => word !== "");
}

/**
 * Desde qué palabra seguir cuando el texto cambia. Si el texto CRECE (el
 * agente mandó otra oración del mismo turno) lo ya mostrado se queda; si es
 * otro texto (turno nuevo), se empieza de cero.
 */
export function revealStart(previous: string, next: string, shown: number): number {
  if (previous !== "" && next.startsWith(previous)) {
    return Math.min(shown, splitWords(next).length);
  }
  return 0;
}

/**
 * Aparición palabra a palabra del texto que se está diciendo (premium F2).
 * Con `prefers-reduced-motion` o `enabled=false` el texto sale entero. Quien
 * lo pinta anuncia el turno completo por `aria-live`, no cada palabra.
 */
export function useWordReveal(
  text: string,
  { msPerWord = 240, enabled = true }: { msPerWord?: number; enabled?: boolean } = {},
): { words: string[]; shown: number; done: boolean } {
  const reduced = useReducedMotion() === true;
  const words = useMemo(() => splitWords(text), [text]);
  // Texto y cuenta viajan juntos: al cambiar el texto la cuenta se ajusta EN
  // el mismo render, sin un cuadro con el texto nuevo a medio mostrar.
  const [tracked, setTracked] = useState({ text: "", shown: 0 });
  if (tracked.text !== text) {
    setTracked({ text, shown: revealStart(tracked.text, text, tracked.shown) });
  }

  const instant = reduced || !enabled;
  const shown = tracked.text === text ? tracked.shown : revealStart(tracked.text, text, tracked.shown);
  const visible = instant ? words.length : Math.min(shown, words.length);
  const done = visible >= words.length;

  // Un intervalo mientras falten palabras; se apaga solo al terminar y vuelve
  // a arrancar si el texto crece.
  useEffect(() => {
    if (instant || done) return;
    const timer = setInterval(
      () =>
        setTracked((current) =>
          current.text === text
            ? { text, shown: Math.min(words.length, current.shown + 1) }
            : current,
        ),
      msPerWord,
    );
    return () => clearInterval(timer);
  }, [instant, done, text, words.length, msPerWord]);

  return { words, shown: visible, done };
}
