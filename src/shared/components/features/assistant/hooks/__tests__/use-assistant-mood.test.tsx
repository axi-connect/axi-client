import { act, renderHook } from "@testing-library/react";

import { GESTURE_MS, TAP_COOLDOWN_MS, TAP_WINDOW_MS, type AssistantMoodInput } from "../../avatar/avatar-mood";
import { useAssistantMood } from "../use-assistant-mood";

/**
 * El reloj de humor y gestos que comparten Axel y Alba. Lo que se protege: la
 * cara sale de la instantánea; el saludo es finito, con cooldown y con el
 * tercer toque como saludo; la pestaña oculta corta el gesto; y al desmontar no
 * queda ningún temporizador vivo. Bajo reduced-motion no hay gesto posible.
 */

let reduced = false;
jest.mock("framer-motion", () => ({ useReducedMotion: () => reduced }));

const base: AssistantMoodInput = {
  blocker: null,
  thinking: false,
  streaming: false,
  lastMessage: null,
  ownerTyping: false,
  celebrating: false,
};

beforeEach(() => {
  reduced = false;
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useAssistantMood", () => {
  it("deriva la cara de la instantánea y la prioridad la manda el dominio", () => {
    const { result, rerender } = renderHook((input: AssistantMoodInput) => useAssistantMood(input), {
      initialProps: base,
    });
    expect(result.current.mood).toBe("idle");
    rerender({ ...base, thinking: true });
    expect(result.current.mood).toBe("thinking");
    rerender({ ...base, thinking: true, streaming: true });
    expect(result.current.mood).toBe("speaking");
    rerender({ ...base, ownerTyping: true, celebrating: true });
    expect(result.current.mood).toBe("listening");
    rerender({ ...base, blocker: "quota" });
    expect(result.current.mood).toBe("asleep");
  });

  it("un toque guiña y termina solo; el toque inmediato cae en el cooldown", () => {
    const { result } = renderHook(() => useAssistantMood(base));
    act(() => {
      result.current.greet();
    });
    expect(result.current.gesture).toBe("wink");
    act(() => {
      result.current.greet();
    });
    expect(result.current.gesture).toBe("wink");
    act(() => {
      jest.advanceTimersByTime(GESTURE_MS.wink);
    });
    expect(result.current.gesture).toBeNull();
    act(() => {
      result.current.greet();
    });
    expect(result.current.gesture).toBeNull();
    act(() => {
      jest.advanceTimersByTime(TAP_COOLDOWN_MS + 1);
      result.current.greet();
    });
    expect(result.current.gesture).toBe("wink");
  });

  it("tres toques dentro de la ventana saludan con la mano", () => {
    const { result } = renderHook(() => useAssistantMood(base));
    const tap = () => {
      act(() => {
        result.current.greet();
      });
      act(() => {
        jest.advanceTimersByTime(GESTURE_MS.wink + TAP_COOLDOWN_MS + 1);
      });
    };
    tap();
    tap();
    act(() => {
      result.current.greet();
    });
    expect(result.current.gesture).toBe("wave");
    expect(GESTURE_MS.wink * 2 + TAP_COOLDOWN_MS * 2 + 2).toBeLessThan(TAP_WINDOW_MS);
  });

  it("ocupado, dormido o disculpándose no saluda", () => {
    for (const input of [
      { ...base, thinking: true },
      { ...base, blocker: "disabled" },
      { ...base, lastMessage: { role: "user" as const, failed: true, hasProposal: false, hasQuestion: false } },
    ]) {
      const { result } = renderHook(() => useAssistantMood(input));
      act(() => {
        result.current.greet();
      });
      expect(result.current.gesture).toBeNull();
    }
  });

  it("la pestaña oculta corta el gesto a medias", () => {
    const { result } = renderHook(() => useAssistantMood(base));
    act(() => {
      result.current.playGesture("wave");
    });
    expect(result.current.gesture).toBe("wave");
    act(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current.gesture).toBeNull();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  });

  it("bajo reduced-motion no hay gestos ni al saludar ni al pedirlos", () => {
    reduced = true;
    const { result } = renderHook(() => useAssistantMood(base));
    expect(result.current.motion).toBe(false);
    act(() => {
      result.current.greet();
      result.current.playGesture("nod");
    });
    expect(result.current.gesture).toBeNull();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("al desmontar no queda ningún temporizador vivo", () => {
    const { result, unmount } = renderHook(() => useAssistantMood(base));
    act(() => {
      result.current.playGesture("wave");
    });
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
