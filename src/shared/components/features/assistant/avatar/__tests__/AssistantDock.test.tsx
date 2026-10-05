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

describe("AssistantDock · la isla viva", () => {
  const question = {
    kind: "question" as const,
    id: "q1",
    eyebrow: "te pregunta",
    title: "¿Es así su horario?",
    datum: { label: "Horario", value: "Lunes a sábado, 9 a 18", origin: "Lo vi en hagogi.com" },
    actions: [
      { id: "ok", label: "Así es", onSelect: jest.fn() },
      { id: "edit", label: "Corregir", onSelect: jest.fn() },
    ],
  };

  it("una sola forma a la vez: `data-shape` dice cuál", () => {
    const { container, rerender } = render(<AssistantDock title="Alba" hero={<span />} />);
    const dock = () => container.querySelector(".assistant-dock");
    expect(dock()).toHaveAttribute("data-shape", "pill");
    rerender(<AssistantDock title="Alba" hero={<span />} item={question} />);
    expect(dock()).toHaveAttribute("data-shape", "question");
    // Trabajar manda sobre lo desplegado: el aviso espera.
    rerender(<AssistantDock title="Alba" hero={<span />} item={question} working activity={<p>x</p>} />);
    expect(dock()).toHaveAttribute("data-shape", "working");
    expect(screen.queryByText("¿Es así su horario?")).toBeNull();
    // Y dictar manda sobre todo.
    rerender(
      <AssistantDock title="Alba" hero={<span />} item={question} listening={{ seconds: 7, onStop: jest.fn(), onCancel: jest.fn() }} />,
    );
    expect(dock()).toHaveAttribute("data-shape", "listening");
    expect(screen.getByText("0:07")).toBeInTheDocument();
  });

  it("la pregunta trae el dato con su origen y botones reales; el primero es el fuerte", () => {
    render(<AssistantDock title="Alba" hero={<span />} item={question} />);
    expect(screen.getByRole("group", { name: "¿Es así su horario?" })).toBeInTheDocument();
    expect(screen.getByText("Lo vi en hagogi.com")).toBeInTheDocument();
    const ok = screen.getByRole("button", { name: "Así es" });
    expect(ok).toHaveAttribute("data-slot", "button");
    expect(ok.className).toMatch(/bg-foreground/);
    expect(screen.getByRole("button", { name: "Corregir" }).className).toMatch(/glass-control/);
    ok.click();
    expect(question.actions[0]?.onSelect).toHaveBeenCalled();
  });

  it("plegar con el chevron o con Escape; la ✕ del aviso descarta", () => {
    const onFold = jest.fn();
    const onDismiss = jest.fn();
    const { rerender } = render(<AssistantDock title="Alba" hero={<span />} item={question} onFold={onFold} />);
    screen.getByRole("button", { name: "Plegar" }).click();
    expect(onFold).toHaveBeenCalledTimes(1);
    const group = screen.getByRole("group");
    group.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(onFold).toHaveBeenCalledTimes(2);

    rerender(
      <AssistantDock
        title="Alba"
        hero={<span />}
        item={{ kind: "notice", id: "n1", glow: "warning", title: "El micrófono está bloqueado" }}
        onFold={onFold}
        onDismiss={onDismiss}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("El micrófono está bloqueado");
    screen.getByRole("button", { name: "Descartar" }).click();
    expect(onDismiss).toHaveBeenCalledWith("n1");
  });

  it("el brillo del aviso va por su tono", () => {
    const { container } = render(
      <AssistantDock title="Alba" hero={<span />} item={{ kind: "notice", id: "n", glow: "success", title: "Listo" }} />,
    );
    expect(container.querySelector(".assistant-dock")).toHaveAttribute("data-glow", "success");
  });

  it("con algo plegado la píldora es un botón con el punto; sin nada, no es interactiva", () => {
    const onExpand = jest.fn();
    const { container, rerender } = render(<AssistantDock title="Axel" hero={<span />} />);
    expect(screen.queryByRole("button")).toBeNull();
    rerender(<AssistantDock title="Axel" hero={<span />} pending={1} onExpand={onExpand} />);
    const pill = screen.getByRole("button", { name: "Axel: 1 pendiente. Abrir" });
    expect(pill).toHaveClass("assistant-island--s");
    expect(container.querySelector(".assistant-dock__badge")).toHaveTextContent("1 pendiente");
    pill.click();
    expect(onExpand).toHaveBeenCalled();
  });

  it("la píldora-botón conserva su estado en palabras como descripción (el aria-label taparía el contenido)", () => {
    render(
      <AssistantDock title="Alba" hero={<span />} status={<span>Ahora: Tu negocio.</span>} pending={1} onExpand={jest.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Alba: 1 pendiente. Abrir" })).toHaveAccessibleDescription(
      "Ahora: Tu negocio.",
    );
  });

  it("el resumen enseña tres líneas como mucho, con su tono", () => {
    render(
      <AssistantDock
        title="Axel"
        hero={<span />}
        item={{
          kind: "summary",
          id: "b1",
          eyebrow: "Informe de hoy",
          title: "La semana cerró mejor.",
          highlights: [
            { label: "Conversaciones", detail: "+18 %", tone: "up" },
            { label: "Sin responder", detail: "7", tone: "warn" },
            { label: "Por decidir", detail: "3", tone: "neutral" },
            { label: "Sobra", detail: "x", tone: "down" },
          ],
          actions: [],
        }}
      />,
    );
    expect(screen.getByRole("region", { name: "La semana cerró mejor." })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("+18 %").closest("li")).toHaveAttribute("data-tone", "up");
  });

  it("sigue habiendo UNA sola instancia del avatar con la isla desplegada", () => {
    render(<AssistantDock title="Alba" hero={<span data-testid="hero" />} item={question} />);
    expect(screen.getAllByTestId("hero")).toHaveLength(1);
  });

  it("en el vacío manda L: el ítem no se despliega ni queda en el orden de tabulación", () => {
    const { container } = render(<AssistantDock title="Axel" hero={<span />} empty item={question} />);
    expect(container.querySelector(".assistant-dock")).toHaveAttribute("data-shape", "pill");
    expect(screen.queryByRole("button", { name: "Así es" })).toBeNull();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("la región viva existe ANTES del aviso y recibe su texto al llegar (así se anuncia)", () => {
    const { rerender } = render(<AssistantDock title="Axel" hero={<span />} />);
    const live = screen.getByRole("status");
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live).toBeEmptyDOMElement();
    rerender(
      <AssistantDock
        title="Axel"
        hero={<span />}
        item={{ kind: "notice", id: "b", glow: "ai", title: "Llegó tu informe", body: "3 por decidir" }}
      />,
    );
    expect(screen.getByRole("status")).toBe(live);
    expect(live).toHaveTextContent("Llegó tu informe. 3 por decidir");
  });
});
