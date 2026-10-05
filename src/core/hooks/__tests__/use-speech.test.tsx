import { act, renderHook } from "@testing-library/react";

import { speechChunks, stopSpeaking, useSpeech } from "../use-speech";

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
  pause: jest.fn(),
  resume: jest.fn(),
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
  it("lee en español, por frases, y el mismo botón pausa y sigue (no vuelve a empezar)", () => {
    const { result } = renderHook(() => useSpeech("q1"));
    expect(result.current.supported).toBe(true);
    act(() => {
      result.current.toggle("¿Es así su horario? Lo vi en su web.");
    });
    expect(spoken.map((u) => u.text)).toEqual(["¿Es así su horario?", "Lo vi en su web."]);
    expect(spoken[0]?.lang).toBe("es-CO");
    expect(spoken[0]?.voice).toEqual({ lang: "es-MX" });
    expect(result.current.state).toBe("speaking");
    act(() => {
      result.current.toggle("¿Es así su horario? Lo vi en su web.");
    });
    expect(synth.pause).toHaveBeenCalled();
    expect(result.current.state).toBe("paused");
    act(() => {
      result.current.toggle("¿Es así su horario? Lo vi en su web.");
    });
    expect(synth.resume).toHaveBeenCalled();
    expect(spoken).toHaveLength(2);
    expect(result.current.state).toBe("speaking");
    // Solo la última frase cierra la lectura.
    act(() => {
      spoken[0]?.onend?.();
    });
    expect(result.current.state).toBe("speaking");
    act(() => {
      spoken[1]?.onend?.();
    });
    expect(result.current.state).toBe("idle");
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
    expect(a.result.current.state).toBe("idle");
    expect(b.result.current.state).toBe("speaking");
    act(() => {
      spoken[0]?.onend?.();
    });
    expect(b.result.current.state).toBe("speaking");
    act(() => {
      spoken[1]?.onend?.();
    });
    expect(b.result.current.state).toBe("idle");
  });

  it("parte en frases por puntuación y saltos de línea", () => {
    expect(speechChunks("Hola. ¿Cómo vas?\nBien!  ")).toEqual(["Hola.", "¿Cómo vas?", "Bien!"]);
    expect(speechChunks("   ")).toEqual([]);
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
    expect(result.current.state).toBe("idle");
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  });
});
