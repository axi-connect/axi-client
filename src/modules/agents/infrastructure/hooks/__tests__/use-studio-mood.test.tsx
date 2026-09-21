import { act, renderHook } from "@testing-library/react";

import { useStudioMood, type StudioMoodInput } from "../use-studio-mood";

const base: StudioMoodInput = {
  paused: false,
  saving: false,
  saveError: false,
  nameFocused: false,
  justSaved: false,
  previewPlaying: false,
  appearanceKey: "nova:white",
};

describe("useStudioMood", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("traduce los estados del estudio a los humores del kit, por prioridad", () => {
    const { result, rerender } = renderHook((props: StudioMoodInput) => useStudioMood(props), { initialProps: base });
    expect(result.current.mood).toBe("idle");
    rerender({ ...base, nameFocused: true });
    expect(result.current.mood).toBe("listening");
    rerender({ ...base, saving: true });
    expect(result.current.mood).toBe("thinking");
    rerender({ ...base, previewPlaying: true });
    expect(result.current.mood).toBe("speaking");
    rerender({ ...base, justSaved: true });
    expect(result.current.mood).toBe("proud");
    rerender({ ...base, saveError: true, saving: true });
    expect(result.current.mood).toBe("sorry");
    rerender({ ...base, paused: true, saveError: true });
    expect(result.current.mood).toBe("asleep");
  });

  it("asiente al cambiar de personaje o color (una vez por cambio), nunca al montar; en reposo no deja temporizadores", () => {
    const { result, rerender } = renderHook((props: StudioMoodInput) => useStudioMood(props), { initialProps: base });
    expect(result.current.gesture).toBeNull();
    expect(jest.getTimerCount()).toBe(0);
    rerender({ ...base, appearanceKey: "cloudee:white" });
    expect(result.current.gesture).toBe("nod");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(result.current.gesture).toBeNull();
    expect(jest.getTimerCount()).toBe(0);
  });
});
