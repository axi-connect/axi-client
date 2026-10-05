import { act, renderHook } from "@testing-library/react";

import { stopSpeaking, useSpeech } from "../use-speech";

class FakeUtterance {
  lang = "";
  voice: unknown = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}

const spoken: FakeUtterance[] = [];
const synth = {
  speak: jest.fn((u: FakeUtterance) => spoken.push(u)),
  cancel: jest.fn(),
  getVoices: jest.fn(() => [{ lang: "en-US" }, { lang: "es-MX" }]),
};

beforeEach(() => {
  spoken.length = 0;
  jest.clearAllMocks();
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: synth });
  Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, writable: true, value: FakeUtterance });
});
afterEach(() => {
  act(() => {
    stopSpeaking();
  });
});

describe("useSpeech", () => {
  it("lee en español y el mismo botón lo calla", () => {
    const { result } = renderHook(() => useSpeech("q1"));
    expect(result.current.supported).toBe(true);
    act(() => {
      result.current.toggle("¿Es así su horario?");
    });
    expect(spoken[0]?.text).toBe("¿Es así su horario?");
    expect(spoken[0]?.lang).toBe("es-CO");
    expect(spoken[0]?.voice).toEqual({ lang: "es-MX" });
    expect(result.current.speaking).toBe(true);
    act(() => {
      result.current.toggle("¿Es así su horario?");
    });
    expect(synth.cancel).toHaveBeenCalled();
    expect(result.current.speaking).toBe(false);
  });

  it("un solo hablante: leer otra clave apaga la anterior, y su `onend` tardío no apaga la nueva", () => {
    const a = renderHook(() => useSpeech("a"));
    const b = renderHook(() => useSpeech("b"));
    act(() => {
      a.result.current.toggle("uno");
    });
    act(() => {
      b.result.current.toggle("dos");
    });
    expect(a.result.current.speaking).toBe(false);
    expect(b.result.current.speaking).toBe(true);
    act(() => {
      spoken[0]?.onend?.();
    });
    expect(b.result.current.speaking).toBe(true);
    act(() => {
      spoken[1]?.onend?.();
    });
    expect(b.result.current.speaking).toBe(false);
  });

  it("se calla al ocultar la pestaña", () => {
    const { result } = renderHook(() => useSpeech("q"));
    act(() => {
      result.current.toggle("hola");
    });
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current.speaking).toBe(false);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  });
});
