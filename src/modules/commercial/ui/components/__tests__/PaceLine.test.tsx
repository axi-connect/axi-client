import { cleanup, render, screen } from "@testing-library/react";
import { PaceLine } from "../PaceLine";
import { pace } from "../../__tests__/fixtures";

afterEach(cleanup);

describe("PaceLine", () => {
  it("lee la semana de una serie ACUMULADA: diferencia contra el viernes anterior, no suma de puntos", () => {
    const { container } = render(<PaceLine pace={pace} />);
    // 27 − 21 = 6 ventas · 33 − 25 = 8 esperadas · 6 / 3 días hábiles = 2 al día
    expect(container).toHaveTextContent(/6\s*ventas/);
    expect(container).toHaveTextContent(/8\s*esperadas/);
    expect(container).toHaveTextContent(/2\s*al día/);
    expect(container).not.toHaveTextContent(/74/); // la suma ingenua 23+24+27
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("con href (F6) la línea es un enlace con su etiqueta", () => {
    render(<PaceLine pace={pace} href="/x" />);
    expect(screen.getByRole("link", { name: /ritmo de esta semana: 6 ventas, esperadas 8, 2 al día/i })).toBeInTheDocument();
  });

  it("sin puntos de la semana de hoy no ocupa sitio", () => {
    const { container } = render(<PaceLine pace={{ ...pace, today: "2026-10-05" }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
