import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import { useRadioGroup } from "@/core/hooks/use-radio-group";

function Group({ initial }: { initial: "a" | "b" | "c" | null }) {
  const [value, setValue] = useState(initial);
  const radio = useRadioGroup(["a", "b", "c"] as const, value, setValue);
  return (
    <div role="radiogroup" aria-label="Opciones">
      {(["a", "b", "c"] as const).map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          {...radio(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

describe("useRadioGroup (auditoría P1–P5, B12)", () => {
  it("un solo tabulador: la elegida; sin elegida, la primera", () => {
    const { unmount } = render(<Group initial="b" />);
    expect(screen.getAllByRole("radio").map((radio) => radio.tabIndex)).toEqual(
      [-1, 0, -1],
    );
    unmount();
    render(<Group initial={null} />);
    expect(screen.getAllByRole("radio").map((radio) => radio.tabIndex)).toEqual(
      [0, -1, -1],
    );
  });

  it("las flechas eligen y mueven el foco, con vuelta; otras teclas no hacen nada", () => {
    render(<Group initial="c" />);
    const [a, , c] = screen.getAllByRole("radio");
    fireEvent.keyDown(c!, { key: "ArrowRight" });
    expect(a).toHaveAttribute("aria-checked", "true");
    expect(a).toHaveFocus();
    fireEvent.keyDown(a!, { key: "ArrowLeft" });
    expect(c).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(c!, { key: "x" });
    expect(c).toHaveAttribute("aria-checked", "true");
  });
});
