import { render } from "@testing-library/react";
import { useRef } from "react";

import { useComposerFlip } from "../use-composer-flip";

let reduced = false;
jest.mock("framer-motion", () => ({ useReducedMotion: () => reduced }));

function Harness({ empty }: { empty: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useComposerFlip(ref, empty);
  return <div ref={ref} data-testid="composer" />;
}

/**
 * La medida se toma al montar (vacío) y otra vez en el render que deja de
 * estarlo: aquí el rect lo da una variable que el test mueve entre los dos.
 */
let top = 0;
beforeEach(() => {
  reduced = false;
  top = 300;
  jest
    .spyOn(HTMLElement.prototype, "getBoundingClientRect")
    .mockImplementation(() => ({ top, bottom: top + 60, left: 0, right: 640, width: 640, height: 60, x: 0, y: top, toJSON: () => ({}) }));
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe("useComposerFlip", () => {
  it("al dejar de estar vacío anima un translateY del sitio viejo al nuevo, una vez", () => {
    const { getByTestId, rerender } = render(<Harness empty />);
    const el = getByTestId("composer");
    const animate = jest.fn(() => ({}) as Animation);
    el.animate = animate;
    top = 700;
    rerender(<Harness empty={false} />);
    expect(animate).toHaveBeenCalledTimes(1);
    const [keyframes] = animate.mock.calls[0] as unknown as [{ transform: string }[]];
    expect(keyframes[0].transform).toBe("translateY(-400px)");
    expect(keyframes[1].transform).toBe("translateY(0)");
    rerender(<Harness empty={false} />);
    expect(animate).toHaveBeenCalledTimes(1);
  });

  it("bajo reduced-motion salta sin viaje", () => {
    reduced = true;
    const { getByTestId, rerender } = render(<Harness empty />);
    const el = getByTestId("composer");
    const animate = jest.fn(() => ({}) as Animation);
    el.animate = animate;
    top = 700;
    rerender(<Harness empty={false} />);
    expect(animate).not.toHaveBeenCalled();
  });
});
