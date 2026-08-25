"use client";

import { useEffect, type RefObject } from "react";

/**
 * El compositor de Axel se escribe solo: teclea ejemplos de lo que se le puede
 * pedir, los borra y pasa al siguiente.
 *
 * Existe porque el placeholder fijo no enseñaba nada. Un dueño que entra por
 * primera vez ve un campo de texto y no sabe que puede pedirle una promo para el
 * fin de semana; las tarjetas de arranque cubren tres casos y desaparecen en
 * cuanto empieza la conversación, así que el compositor es el único sitio que
 * sigue sugiriendo.
 *
 * Cuatro decisiones que explican la forma que tiene:
 *
 * 1. **Cero re-renders.** Escribe `el.placeholder` por el ref en vez de pasar
 *    por estado. Un `useState` por carácter serían ~25 renders por frase del
 *    árbol entero del chat —hilo, burbujas, tarjetas— para animar un atributo
 *    que React no necesita conocer. Solo hay un `setTimeout` vivo a la vez.
 *
 *    **Invariante:** el `placeholder` que declara el JSX tiene que ser una
 *    CONSTANTE. React solo parchea un atributo cuando su prop cambia, así que
 *    una prop fija no pisa nunca lo que escribe este hook; si alguien la vuelve
 *    dinámica, sus renders empezarían a borrar la animación a medias. Esa misma
 *    constante es además lo que se ve en SSR y sin JavaScript, y es el `fallback`
 *    al que se vuelve en cada pausa.
 *
 * 2. **Se para cuando molesta.** Con foco (no se teclea debajo del cursor del
 *    usuario), con la pestaña oculta (no se gasta un temporizador de fondo por
 *    una animación que nadie ve) y cuando el llamador lo apaga: campo con texto,
 *    turno en curso o Axel bloqueado.
 *
 * 3. **Sin jitter**, al contrario que el terminal de la landing
 *    (`landing/ui/components/mockups/TerminalMockup.tsx`, de donde sale la forma
 *    del bucle). Ahí la cadencia irregular imita a una persona escribiendo y es
 *    parte del gag; en un campo real de la aplicación un ritmo errático se lee
 *    como un fallo de rendimiento.
 *
 * 4. **`prefers-reduced-motion` deja una frase entera** y no vuelve a tocar el
 *    atributo. No se degrada al texto genérico: quien no quiere movimiento sigue
 *    mereciendo el ejemplo concreto, que es para lo que existe el efecto.
 */

/** Cadencias. Teclear más lento que borrar: escribir se lee, borrar se salta. */
const TYPE_MS = 34;
const ERASE_MS = 18;
/** Reposo con la frase completa: es el único momento en que de verdad se lee. */
const HOLD_MS = 1_800;
/** Hueco en blanco antes de la siguiente, para que no parezca una sola cadena. */
const GAP_MS = 400;

interface Options {
  /**
   * Las frases, en orden. **Tiene que ser una referencia estable** (una
   * constante de módulo): un array literal en el render reiniciaría el efecto en
   * cada pasada y la frase nunca llegaría a terminarse.
   */
  phrases: readonly string[];
  /** El texto de reposo: el mismo que declara el JSX. Se restaura en cada pausa. */
  fallback: string;
  /** false = quieto en `fallback` (campo con texto, turno en curso, bloqueado). */
  enabled: boolean;
}

export function useTypewriterPlaceholder(
  ref: RefObject<HTMLTextAreaElement | null>,
  { phrases, fallback, enabled }: Options,
): void {
  useEffect(() => {
    const el = ref.current;
    if (el === null || phrases.length === 0) return;

    if (!enabled) {
      el.placeholder = fallback;
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.placeholder = phrases[0];
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    /* `phrase` vive fuera de `start`: `start` reinicia la POSICIÓN dentro de la
       frase, no la lista. Cuál toca lo decide `sync` al pausar. */
    let phrase = 0;
    let at = 0;
    let erasing = false;
    let running = false;

    const tick = (): void => {
      const current = phrases[phrase];
      if (!erasing) {
        at += 1;
        el.placeholder = current.slice(0, at);
        erasing = at >= current.length;
        timer = setTimeout(tick, erasing ? HOLD_MS : TYPE_MS);
        return;
      }
      at -= 1;
      el.placeholder = current.slice(0, at);
      if (at <= 0) {
        erasing = false;
        phrase = (phrase + 1) % phrases.length;
        timer = setTimeout(tick, GAP_MS);
        return;
      }
      timer = setTimeout(tick, ERASE_MS);
    };

    const stop = (): void => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      running = false;
    };

    const start = (): void => {
      if (running) return;
      running = true;
      at = 0;
      erasing = false;
      timer = setTimeout(tick, GAP_MS);
    };

    /* Una sola función para las tres señales: el estado deseado se DERIVA del
       DOM en vez de llevarse a mano. Con banderas separadas por evento, un
       `blur` con la pestaña oculta reanudaba la animación. */
    const sync = (): void => {
      if (document.hidden || document.activeElement === el) {
        /* Una pausa a mitad de frase la descarta y pasa a la siguiente. Sin
           esto, enfocar y desenfocar mostraba SIEMPRE el mismo ejemplo — que es
           justo lo que este efecto existe para evitar. La guarda de `running`
           impide que dos señales seguidas (foco + pestaña oculta) salten dos. */
        if (running && at > 0) phrase = (phrase + 1) % phrases.length;
        stop();
        el.placeholder = fallback;
        return;
      }
      start();
    };

    el.addEventListener("focus", sync);
    el.addEventListener("blur", sync);
    document.addEventListener("visibilitychange", sync);
    sync();

    return () => {
      stop();
      el.removeEventListener("focus", sync);
      el.removeEventListener("blur", sync);
      document.removeEventListener("visibilitychange", sync);
      el.placeholder = fallback;
    };
  }, [ref, phrases, fallback, enabled]);
}
