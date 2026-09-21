import { act, renderHook } from "@testing-library/react";

import { useStoredAccessory } from "../use-stored-accessory";

const OPTS = { storageKey: "test.accessory", changeEvent: "test:accessory:change" } as const;

beforeEach(() => {
  window.localStorage.clear();
});

describe("useStoredAccessory", () => {
  it("sin nada guardado devuelve el fallback; un valor inválido también", () => {
    const { result } = renderHook(() => useStoredAccessory(OPTS));
    expect(result.current[0]).toBe("none");
    window.localStorage.setItem(OPTS.storageKey, "sombrero");
    const second = renderHook(() => useStoredAccessory({ ...OPTS, fallback: "headset" }));
    expect(second.result.current[0]).toBe("headset");
  });

  it("guardar escribe en localStorage y avisa en la misma pestaña", () => {
    const { result } = renderHook(() => useStoredAccessory(OPTS));
    act(() => {
      result.current[1]("headset");
    });
    expect(window.localStorage.getItem(OPTS.storageKey)).toBe("headset");
    expect(result.current[0]).toBe("headset");
  });

  it("dos claves distintas no se pisan", () => {
    const a = renderHook(() => useStoredAccessory(OPTS));
    const b = renderHook(() => useStoredAccessory({ storageKey: "otra", changeEvent: "otra:change" }));
    act(() => {
      a.result.current[1]("headset");
    });
    expect(a.result.current[0]).toBe("headset");
    expect(b.result.current[0]).toBe("none");
  });
});
