import { useRef } from "react";
import { act, render, screen } from "@testing-library/react";

import { useTypewriterPlaceholder } from "@/modules/cmo/infrastructure/hooks/use-typewriter-placeholder";

/* Frases cortas a propósito: los asserts cuentan caracteres, y con las de
   producción cada paso serían cuarenta avances del reloj. */
const PHRASES = ["uno dos", "tres"] as const;
const FALLBACK = "en reposo";

/** Las dos cadencias que algún test afirma directamente (el resto va por pasos). */
const GAP = 400;
const HOLD = 1_800;

function Harness({ enabled = true }: { enabled?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useTypewriterPlaceholder(ref, { phrases: PHRASES, fallback: FALLBACK, enabled });
  return <textarea ref={ref} placeholder={FALLBACK} aria-label="campo" />;
}

const field = (): HTMLTextAreaElement => screen.getByLabelText("campo");

/**
 * Avanza `n` temporizadores, uno a uno.
 *
 * Se usa esto y no `advanceTimersByTime(ms)` para todo lo que sea SECUENCIA. Con
 * milisegundos calculados a mano, cada paso deja unos milisegundos de sobrante
 * dentro del siguiente intervalo; el sobrante se acumula y al cuarto o quinto
 * salto la aserción cae en el carácter de al lado. La secuencia se comprueba por
 * pasos y los milisegundos se reservan para cuando la duración ES lo que se
 * afirma (el reposo, y que con foco no pase nada).
 */
const steps = (n: number): void => {
  act(() => {
    jest.advanceTimersToNextTimer(n);
  });
};

const tick = (ms: number): void => {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
};

/** Desde el reposo, deja la frase `index` escrita entera. */
const typeWhole = (index: number): void => {
  steps(PHRASES[index].length);
};

/** Desde una frase completa: la borra, pasa a la siguiente y teclea 1 carácter. */
const eraseAndAdvance = (index: number): void => {
  steps(PHRASES[index].length + 1);
};

describe("el compositor de Axel se escribe solo", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("teclea la frase carácter a carácter", () => {
    render(<Harness />);

    // Antes del primer hueco sigue el texto de reposo: no arranca de golpe.
    expect(field().placeholder).toBe(FALLBACK);
    tick(GAP - 1);
    expect(field().placeholder).toBe(FALLBACK);

    steps(1);
    expect(field().placeholder).toBe("u");

    steps(1);
    expect(field().placeholder).toBe("un");

    steps(5);
    expect(field().placeholder).toBe("uno dos");
  });

  it("borra lo escrito y pasa a la siguiente frase", () => {
    render(<Harness />);
    typeWhole(0);
    expect(field().placeholder).toBe("uno dos");

    // Reposa con la frase completa: es el único momento en que se lee de verdad,
    // y aquí la duración SÍ es lo que se afirma.
    tick(HOLD - 1);
    expect(field().placeholder).toBe("uno dos");
    tick(1);
    expect(field().placeholder).toBe("uno do");

    steps(6);
    expect(field().placeholder).toBe("");

    steps(1);
    expect(field().placeholder).toBe("t");
  });

  it("da la vuelta a la lista en vez de quedarse en la última", () => {
    render(<Harness />);
    typeWhole(0);

    eraseAndAdvance(0);
    steps(PHRASES[1].length - 1);
    expect(field().placeholder).toBe("tres");

    // La última no es el final: vuelve a la primera.
    eraseAndAdvance(1);
    expect(field().placeholder).toBe("u");
  });

  it("para en seco al enfocar y no teclea debajo del cursor", () => {
    render(<Harness />);
    steps(3);
    expect(field().placeholder).toBe("uno");

    act(() => {
      field().focus();
    });
    expect(field().placeholder).toBe(FALLBACK);

    // Con el foco dentro no queda ni un temporizador vivo: no es que el texto
    // coincida, es que no hay nada programado que pudiera cambiarlo.
    expect(jest.getTimerCount()).toBe(0);
    tick(HOLD * 3);
    expect(field().placeholder).toBe(FALLBACK);
  });

  it("retoma al perder el foco, y por la frase SIGUIENTE", () => {
    render(<Harness />);
    typeWhole(0);
    act(() => {
      field().focus();
    });
    act(() => {
      field().blur();
    });

    // Descarta la frase interrumpida: enfocar y desenfocar mostrando siempre el
    // mismo ejemplo es justo lo que el efecto existe para evitar.
    steps(1);
    expect(field().placeholder).toBe("t");
  });

  it("se queda quieto cuando el llamador lo apaga", () => {
    render(<Harness enabled={false} />);

    expect(jest.getTimerCount()).toBe(0);
    tick(HOLD * 3);
    expect(field().placeholder).toBe(FALLBACK);
  });

  it("con movimiento reducido deja UNA frase entera y no la borra", () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    try {
      render(<Harness />);
      // Completa desde el primer frame: no se degrada al texto genérico, porque
      // quien no quiere movimiento sigue mereciendo el ejemplo concreto.
      expect(field().placeholder).toBe("uno dos");

      // Y no la borra nunca, porque no programó nada que la borrase.
      expect(jest.getTimerCount()).toBe(0);
      tick(HOLD * 3);
      expect(field().placeholder).toBe("uno dos");
    } finally {
      window.matchMedia = original;
    }
  });

  it("al desmontar no deja ningún temporizador vivo", () => {
    const { unmount } = render(<Harness />);
    steps(3);

    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("el placeholder del JSX no pisa lo que escribe el hook", () => {
    // La invariante documentada: la prop es una CONSTANTE, así que un re-render
    // no vuelve a parchear el atributo. Si alguien la volviera dinámica, este
    // test caería y explicaría por qué.
    const { rerender } = render(<Harness />);
    steps(3);
    expect(field().placeholder).toBe("uno");

    rerender(<Harness />);
    expect(field().placeholder).toBe("uno");
  });
});
