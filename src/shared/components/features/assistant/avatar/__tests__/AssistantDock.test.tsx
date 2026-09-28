import { act, render, renderHook, screen } from "@testing-library/react";

import { AssistantDock, useTodayLabel } from "../AssistantDock";

describe("AssistantDock", () => {
  it("monta el hero dentro de la barra, con el nombre y la meta decorativos", () => {
    render(<AssistantDock title="Alba" hero={<span data-testid="hero" />} meta="Poniendo a punto Savage" />);
    expect(screen.getByTestId("hero").closest(".assistant-dock__hero")).not.toBeNull();
    expect(screen.getByText("Alba")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Poniendo a punto Savage")).toHaveAttribute("aria-hidden", "true");
  });

  it("sin meta no pinta el hueco", () => {
    const { container } = render(<AssistantDock title="Axel" hero={<span />} />);
    expect(container.querySelector(".assistant-dock__meta")).toBeNull();
  });

  it("la fecha se calcula tras montar, nunca en el primer render", () => {
    const { result } = renderHook(() => useTodayLabel());
    act(() => undefined);
    // «vie, 18 sept»: sin el «de» ni los puntos de la abreviatura.
    expect(result.current).toEqual(expect.stringMatching(/\d{1,2}/));
    expect(result.current).not.toMatch(/ de |\./);
  });
});

describe("AssistantDock · la isla", () => {
  it("en reposo es la píldora: sin `data-working` y sin la actividad montada", () => {
    const { container } = render(
      <AssistantDock title="Axel" hero={<span />} activity={<p>Leyendo tus ventas</p>} />,
    );
    expect(container.querySelector(".assistant-dock")).not.toHaveAttribute("data-working");
    expect(screen.queryByText("Leyendo tus ventas")).toBeNull();
  });

  it("trabajando crece a M y enseña lo que hace", () => {
    const { container } = render(
      <AssistantDock title="Axel" hero={<span />} working activity={<p>Leyendo tus ventas</p>} />,
    );
    expect(container.querySelector(".assistant-dock")).toHaveAttribute("data-working");
    expect(screen.getByText("Leyendo tus ventas").closest(".assistant-island--m")).not.toBeNull();
  });

  it("el estado cierra la píldora, y la isla es tinta con su propio esquema", () => {
    const { container } = render(<AssistantDock title="Alba" hero={<span />} status={<span>Entregas · 3 de 6</span>} />);
    const pill = container.querySelector(".assistant-island--s");
    expect(pill).toHaveClass("island-ink", "surface-dark");
    expect(screen.getByText("Entregas · 3 de 6").closest(".assistant-island--s")).toBe(pill);
  });

  it("hay UNA sola instancia del avatar para las tres formas", () => {
    render(<AssistantDock title="Axel" hero={<span data-testid="hero" />} working activity={<p>x</p>} />);
    expect(screen.getAllByTestId("hero")).toHaveLength(1);
  });
});
