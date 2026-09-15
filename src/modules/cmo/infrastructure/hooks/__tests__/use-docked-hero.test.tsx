import { act, render } from "@testing-library/react";
import { useRef } from "react";

import { useDockedHero } from "../use-docked-hero";

/**
 * El acople de la barra de Axel no pasa por React: un `IntersectionObserver`
 * escribe `data-docked` en la raíz por ref. El polyfill de jest.setup es inerte,
 * así que aquí se instala uno que captura el callback para disparar el cruce a
 * mano (patrón de `InboxList.test.tsx`).
 */
type Entry = { isIntersecting: boolean; boundingClientRect: { top: number }; rootBounds: { top: number } | null };
let intersect: ((entries: Entry[]) => void) | null = null;
const disconnect = jest.fn();
class FakeIO {
  constructor(callback: (entries: Entry[]) => void) {
    intersect = callback;
  }
  observe() {}
  disconnect() {
    disconnect();
    intersect = null;
  }
  unobserve() {}
}

function Harness({ enabled }: { enabled: boolean }) {
  const root = useRef<HTMLDivElement | null>(null);
  const scroller = useRef<HTMLDivElement | null>(null);
  const sentinel = useRef<HTMLDivElement | null>(null);
  useDockedHero(root, scroller, sentinel, { enabled });
  return (
    <div ref={root} data-testid="root">
      <div ref={scroller}>
        <div ref={sentinel} />
      </div>
    </div>
  );
}

const original = globalThis.IntersectionObserver;
beforeEach(() => {
  (globalThis as { IntersectionObserver: unknown }).IntersectionObserver = FakeIO;
  intersect = null;
  disconnect.mockClear();
});
afterEach(() => {
  globalThis.IntersectionObserver = original;
});

describe("useDockedHero", () => {
  it("acopla cuando el centinela sale por arriba y desacopla cuando vuelve", () => {
    const { getByTestId } = render(<Harness enabled />);
    const root = getByTestId("root");
    expect(root.hasAttribute("data-docked")).toBe(false);

    act(() => {
      intersect?.([{ isIntersecting: false, boundingClientRect: { top: -10 }, rootBounds: { top: 0 } }]);
    });
    expect(root.hasAttribute("data-docked")).toBe(true);

    act(() => {
      intersect?.([{ isIntersecting: true, boundingClientRect: { top: 40 }, rootBounds: { top: 0 } }]);
    });
    expect(root.hasAttribute("data-docked")).toBe(false);
  });

  it("no acopla si el centinela salió por ABAJO (layout corto)", () => {
    const { getByTestId } = render(<Harness enabled />);
    act(() => {
      intersect?.([{ isIntersecting: false, boundingClientRect: { top: 900 }, rootBounds: { top: 0 } }]);
    });
    expect(getByTestId("root").hasAttribute("data-docked")).toBe(false);
  });

  it("deshabilitado no observa; al desmontar desconecta y limpia el atributo", () => {
    const { rerender, unmount, getByTestId } = render(<Harness enabled={false} />);
    expect(intersect).toBeNull();

    rerender(<Harness enabled />);
    act(() => {
      intersect?.([{ isIntersecting: false, boundingClientRect: { top: -10 }, rootBounds: { top: 0 } }]);
    });
    expect(getByTestId("root").hasAttribute("data-docked")).toBe(true);

    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});
