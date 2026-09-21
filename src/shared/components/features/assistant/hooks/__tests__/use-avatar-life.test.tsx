import { act, render } from "@testing-library/react";
import { useRef } from "react";

import { useAvatarLife } from "../use-avatar-life";

/**
 * La vida del personaje solo existe con un turno vivo: en reposo, cero
 * temporizadores tras el despertar; con `live`, parpadea; al desmontar, nada.
 */

function Harness({ live, saccades, motion, cue }: { live: boolean; saccades: boolean; motion: boolean; cue: string }) {
  const ref = useRef<SVGSVGElement | null>(null);
  useAvatarLife(ref, { live, saccades, motion, cue });
  return <svg ref={ref} data-testid="face" />;
}

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe("useAvatarLife", () => {
  it("despierta con un doble parpadeo y luego, en reposo, no queda ningún temporizador", () => {
    const { getByTestId } = render(<Harness live={false} saccades={false} motion cue="idle" />);
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(getByTestId("face").dataset.blink).toBe("1");
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(getByTestId("face").dataset.blink).toBeUndefined();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("un cambio de humor produce un parpadeo finito", () => {
    const { getByTestId, rerender } = render(<Harness live={false} saccades={false} motion cue="idle" />);
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    rerender(<Harness live={false} saccades={false} motion cue="curious" />);
    expect(getByTestId("face").dataset.blink).toBe("1");
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(jest.getTimerCount()).toBe(0);
  });

  it("con turno vivo encadena parpadeos y, pensando, mueve la mirada; al morir el turno se apaga todo", () => {
    const { getByTestId, rerender } = render(<Harness live saccades motion cue="thinking" />);
    act(() => {
      jest.advanceTimersByTime(6000);
    });
    const face = getByTestId("face");
    expect(face.style.getPropertyValue("--av-sac-x")).not.toBe("");
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    rerender(<Harness live={false} saccades={false} motion cue="idle" />);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(face.style.getPropertyValue("--av-sac-x")).toBe("0");
    expect(jest.getTimerCount()).toBe(0);
  });

  it("bajo reduced-motion no programa nada, ni al despertar", () => {
    render(<Harness live saccades motion={false} cue="thinking" />);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("al desmontar a mitad de un turno no queda ningún temporizador", () => {
    const { unmount } = render(<Harness live saccades motion cue="thinking" />);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
