import { act, renderHook } from "@testing-library/react";

import { useInView } from "../use-in-view";

type Callback = (entries: { isIntersecting: boolean }[]) => void;

let callback: Callback | null = null;
const observe = jest.fn();
const disconnect = jest.fn();

beforeEach(() => {
  callback = null;
  observe.mockClear();
  disconnect.mockClear();
  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    writable: true,
    value: jest.fn((cb: Callback) => {
      callback = cb;
      return { observe, disconnect };
    }),
  });
});

describe("useInView", () => {
  it("sin elemento se considera a la vista (la isla no despliega lo que ya se ve)", () => {
    const { result } = renderHook(() => useInView(null));
    expect(result.current).toBe(true);
    expect(observe).not.toHaveBeenCalled();
  });

  it("cambia solo al cruzar el umbral, y desconecta al desmontar", () => {
    const el = document.createElement("div");
    const { result, unmount } = renderHook(() => useInView(el, { rootMargin: "-64px 0px 0px 0px" }));
    expect(observe).toHaveBeenCalledWith(el);
    act(() => {
      callback?.([{ isIntersecting: false }]);
    });
    expect(result.current).toBe(false);
    act(() => {
      callback?.([{ isIntersecting: true }]);
    });
    expect(result.current).toBe(true);
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});
