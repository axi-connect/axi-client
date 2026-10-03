import { render } from "@testing-library/react";

import { StepMark, type StepMarkState } from "../StepMark";

function mark(state: StepMarkState, props: Partial<React.ComponentProps<typeof StepMark>> = {}) {
  const { container } = render(<StepMark number={3} state={state} {...props} />);
  return container.firstElementChild as HTMLElement;
}

describe("StepMark", () => {
  it("es decorativa: el estado lo dice el paso", () => {
    expect(mark("pending")).toHaveAttribute("aria-hidden", "true");
  });

  it("pendiente, en curso y con error llevan el número", () => {
    for (const state of ["pending", "current", "error"] as const) {
      const el = mark(state);
      expect(el).toHaveTextContent("3");
      expect(el).toHaveAttribute("data-state", state);
      expect(el.querySelector("svg")).toBeNull();
    }
  });

  it("hecho lleva ✓, o su número si `showCheck` es `false`", () => {
    const done = mark("done");
    expect(done.querySelector("svg")).not.toBeNull();
    expect(done).not.toHaveTextContent("3");

    const numbered = mark("done", { showCheck: false });
    expect(numbered.querySelector("svg")).toBeNull();
    expect(numbered).toHaveTextContent("3");
  });

  it("bloqueado lleva «!» con el anillo de aviso", () => {
    const el = mark("blocked");
    expect(el).toHaveTextContent("!");
    expect(el).not.toHaveTextContent("3");
    expect(el).toHaveClass("border-warning");
  });

  it("cada cara de «falta» y de estado usa sus tokens", () => {
    expect(mark("pending")).toHaveClass("bg-muted");
    expect(mark("pending", { pendingStyle: "outline" })).toHaveClass("border-border");
    expect(mark("pending", { pendingStyle: "faint" })).toHaveClass("text-muted-foreground", "ring-border");
    expect(mark("current")).toHaveClass("border-brand");
    expect(mark("done")).toHaveClass("bg-foreground", "text-background");
    expect(mark("error")).toHaveClass("bg-destructive/15");
  });

  it("los tamaños: 24, 28 y 32 px", () => {
    expect(mark("pending", { size: "sm" })).toHaveClass("size-6");
    expect(mark("pending", { size: "md" })).toHaveClass("size-7");
    expect(mark("pending")).toHaveClass("size-8");
  });
});
