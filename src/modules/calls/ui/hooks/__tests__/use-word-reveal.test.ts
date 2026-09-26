import { act, renderHook } from "@testing-library/react";

import { revealStart, splitWords, useWordReveal } from "../use-word-reveal";

let reduced = false;
jest.mock("framer-motion", () => ({ useReducedMotion: () => reduced }));

describe("revelado palabra a palabra (premium F2)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    reduced = false;
  });
  afterEach(() => jest.useRealTimers());

  it("revealStart: si el texto crece se conserva lo mostrado; si es otro, desde cero", () => {
    expect(revealStart("Claro que sí.", "Claro que sí. Tengo un espacio.", 3)).toBe(3);
    expect(revealStart("Claro que sí.", "¿Te sirve?", 3)).toBe(0);
    expect(revealStart("", "Hola", 5)).toBe(0);
    expect(splitWords("  Hola   Laura ")).toEqual(["Hola", "Laura"]);
  });

  it("muestra una palabra por intervalo y sigue donde iba cuando el texto crece", () => {
    const { result, rerender } = renderHook(({ text }) => useWordReveal(text, { msPerWord: 100 }), {
      initialProps: { text: "Claro que sí." },
    });
    expect(result.current.shown).toBe(0);
    act(() => jest.advanceTimersByTime(100));
    act(() => jest.advanceTimersByTime(100));
    expect(result.current.shown).toBe(2);

    rerender({ text: "Claro que sí. Tengo un espacio." });
    expect(result.current.shown).toBe(2);
    act(() => jest.advanceTimersByTime(1_000));
    expect(result.current.shown).toBe(6);
    expect(result.current.done).toBe(true);
  });

  it("con movimiento reducido el texto sale entero", () => {
    reduced = true;
    const { result } = renderHook(() => useWordReveal("Tengo un espacio a las 2:30."));
    expect(result.current.shown).toBe(6);
    expect(result.current.done).toBe(true);
  });
});
