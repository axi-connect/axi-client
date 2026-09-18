import { act, render, screen } from "@testing-library/react";

import { AssistantThinking } from "../AssistantThinking";

describe("AssistantThinking", () => {
  it("con pasos del servidor pinta los pasos y cuenta las lecturas hechas", () => {
    render(
      <AssistantThinking
        steps={[
          { label: "Leí las clientas", done: true, ms: 820 },
          { label: "Redacto el mensaje", done: false, ms: null },
        ]}
        phrases={["Revisando…"]}
      />,
    );
    expect(screen.getByText("Leí las clientas")).toBeInTheDocument();
    expect(screen.getByText("820 ms")).toBeInTheDocument();
    expect(screen.getByText(/Trabajando · 1 lectura/)).toBeInTheDocument();
    expect(screen.queryByText("Revisando…")).not.toBeInTheDocument();
  });

  it("sin pasos pero con frases, rota y se detiene en la última", () => {
    jest.useFakeTimers();
    render(<AssistantThinking phrases={["Uno…", "Dos…"]} />);
    expect(screen.getByText("Uno…")).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(6000);
    });
    expect(screen.getByText("Dos…")).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(20000);
    });
    expect(screen.getByText("Dos…")).toBeInTheDocument();
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  });

  it("sin pasos ni frases son tres puntos con su etiqueta", () => {
    render(<AssistantThinking />);
    const dots = screen.getByRole("status", { name: "Está pensando" });
    expect(dots.querySelectorAll("i")).toHaveLength(3);
    expect(dots).toHaveAttribute("aria-busy", "true");
  });
});
