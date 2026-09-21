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
