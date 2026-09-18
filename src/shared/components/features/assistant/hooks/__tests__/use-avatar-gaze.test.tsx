import { act, fireEvent, render } from "@testing-library/react";
import { useRef } from "react";

import { useAvatarGaze } from "../use-avatar-gaze";

/**
 * La mirada escribe al DOM por ref y no toca React: lo que se comprueba es que
 * las variables aterrizan en el nodo, acotadas, con UN solo frame por ráfaga de
 * movimientos, y que al apagarse no queda ni un listener ni una variable.
 */
function Harness({ enabled }: { enabled: boolean }) {
  const ref = useRef<SVGSVGElement | null>(null);
  useAvatarGaze(ref, { enabled });
  return <svg ref={ref} data-testid="face" />;
}

const finePointer = (matches: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("pointer: fine") ? matches : false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })) as unknown as typeof window.matchMedia;
};

describe("useAvatarGaze", () => {
  let rafQueue: FrameRequestCallback[] = [];
  beforeEach(() => {
    rafQueue = [];
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });
    jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    jest.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      left: 400, top: 200, width: 100, height: 100, right: 500, bottom: 300, x: 400, y: 200, toJSON: () => ({}),
    });
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("sigue al puntero: variables acotadas y un solo frame por ráfaga", () => {
    finePointer(true);
    const { getByTestId } = render(<Harness enabled />);
    const face = getByTestId("face");

    // `MouseEvent` a mano: jsdom no tiene `PointerEvent` y el `pointerMove` de
    // Testing Library llegaría sin `clientX`.
    const move = (clientX: number, clientY: number) => {
      window.dispatchEvent(new MouseEvent("pointermove", { clientX, clientY, bubbles: true }));
    };
    move(590, 250);
    move(5000, -5000);
    expect(rafQueue).toHaveLength(1);

    act(() => {
      rafQueue[0]?.(0);
    });
    // Saturado al borde: clamp a ±1 (el segundo move fue lejísimos).
    expect(face.style.getPropertyValue("--gaze-x")).toBe("1.000");
    expect(face.style.getPropertyValue("--gaze-y")).toBe("-1.000");
    expect(face.dataset.tracking).toBe("1");
  });

  it("al salir el ratón vuelve al centro con asentamiento", () => {
    finePointer(true);
    const { getByTestId } = render(<Harness enabled />);
    const face = getByTestId("face");
    fireEvent.mouseLeave(document.documentElement);
    expect(face.style.getPropertyValue("--gaze-x")).toBe("0");
    expect(face.dataset.gaze).toBe("settle");
    expect(face.dataset.tracking).toBeUndefined();
  });

  it("sin puntero fino no engancha nada", () => {
    finePointer(false);
    const add = jest.spyOn(window, "addEventListener");
    render(<Harness enabled />);
    expect(add.mock.calls.some(([type]) => type === "pointermove")).toBe(false);
  });

  it("deshabilitado no escucha y al apagarse limpia listeners y variables", () => {
    finePointer(true);
    const add = jest.spyOn(window, "addEventListener");
    const remove = jest.spyOn(window, "removeEventListener");
    const { rerender, getByTestId } = render(<Harness enabled />);
    expect(add.mock.calls.some(([type]) => type === "pointermove")).toBe(true);

    rerender(<Harness enabled={false} />);
    expect(remove.mock.calls.some(([type]) => type === "pointermove")).toBe(true);
    const face = getByTestId("face");
    expect(face.style.getPropertyValue("--gaze-x")).toBe("");
    expect(face.dataset.gaze).toBeUndefined();
  });
});
