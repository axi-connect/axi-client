import { act, render, screen } from "@testing-library/react";

import { AssistantIslandActivity } from "../AssistantIslandActivity";

const step = (label: string, done: boolean, ms: number | null = null) => ({ label, done, ms });

describe("AssistantIslandActivity", () => {
  it("enseña el paso anterior con su duración y el actual, no toda la lista", () => {
    render(
      <AssistantIslandActivity
        steps={[step("Leyendo tu embudo", true, 380), step("Revisando ventas", true, 420), step("Buscando recompras", false)]}
      />,
    );
    expect(screen.queryByText("Leyendo tu embudo")).toBeNull();
    expect(screen.getByText("Revisando ventas")).toBeInTheDocument();
    expect(screen.getByText("420 ms")).toBeInTheDocument();
    expect(screen.getByText("Buscando recompras").closest("li")).toHaveClass("assistant-island__line--now");
    // Lo que se puede afirmar: cuántas lecturas van hechas, sin prometer un total.
    expect(screen.getByText(/Trabajando · 2 lecturas/)).toBeInTheDocument();
  });

  it("sin pasos rota las frases y se detiene en la última", () => {
    jest.useFakeTimers();
    render(<AssistantIslandActivity phrases={["Uno…", "Dos…"]} />);
    expect(screen.getByText("Uno…")).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(6000);
    });
    expect(screen.getByText("Dos…").closest("li")).toHaveClass("assistant-island__line--now");
    expect(screen.getByText("Uno…").closest("li")).toHaveClass("assistant-island__line--before");
    act(() => {
      jest.advanceTimersByTime(60000);
    });
    expect(screen.getByText("Dos…")).toBeInTheDocument();
    jest.useRealTimers();
  });

  it("es una región viva y ocupada para el lector de pantalla", () => {
    const { container } = render(<AssistantIslandActivity />);
    expect(container.firstChild).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Pensando…")).toBeInTheDocument();
  });
});
