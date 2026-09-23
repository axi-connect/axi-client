import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { InlineFigures } from "../InlineFigures";

const figures = [
  { key: "a", value: 6, label: "ventas" },
  { key: "b", value: "1,5", label: "al día", good: true },
];

afterEach(cleanup);

describe("InlineFigures", () => {
  it("con `href` la línea entera es un enlace y lleva la etiqueta accesible", () => {
    render(<InlineFigures eyebrow="Ritmo · esta semana" figures={figures} href="/x" ariaLabel="Ritmo: 6 ventas" />);
    const link = screen.getByRole("link", { name: "Ritmo: 6 ventas" });
    expect(link).toHaveAttribute("href", "/x");
    expect(link).toHaveTextContent("Ritmo · esta semana");
  });

  it("con `onClick` y sin `href` es un botón", () => {
    const onClick = jest.fn();
    render(<InlineFigures eyebrow="Tus agentes · hoy" figures={figures} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: /tus agentes/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("sin acción es una línea estática con lo que cuelga al final", () => {
    render(<InlineFigures eyebrow="Tus agentes · hoy" figures={figures} trailing={<button type="button">sin enviar</button>} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("button", { name: "sin enviar" })).toBeInTheDocument();
  });

  it("el filete cambia con quién firma: violeta la IA, coral el negocio", () => {
    const { container, rerender } = render(<InlineFigures eyebrow="x" figures={figures} />);
    expect(container.firstChild).toHaveClass("border-l-accent-violet/60");
    rerender(<InlineFigures eyebrow="x" figures={figures} accent="brand" />);
    expect(container.firstChild).toHaveClass("border-l-brand");
  });
});
