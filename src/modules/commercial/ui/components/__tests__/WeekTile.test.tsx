import { cleanup, render, screen } from "@testing-library/react";
import { WeekTile } from "../WeekTile";
import { TicketTile } from "../TicketTile";
import { pace, plan } from "../../__tests__/fixtures";

afterEach(cleanup);

describe("WeekTile (antes la línea del ritmo)", () => {
  it("lee la semana de una serie ACUMULADA: diferencia contra el sábado anterior, no suma de puntos", () => {
    const { container } = render(<WeekTile pace={pace} href="/comercial/resultados/sales" />);
    expect(container).toHaveTextContent(/6\s*ventas de 8 esperadas/);
    expect(container).toHaveTextContent(/2 al día · la línea es lo esperado \(1,65\)/);
    expect(container).not.toHaveTextContent(/74/); // la suma ingenua 23+24+27
    expect(container).toHaveTextContent("21 – 26 sep");
  });

  it("la ficha entera es un enlace al detalle de ventas con su etiqueta", () => {
    render(<WeekTile pace={pace} href="/comercial/resultados/sales" />);
    expect(screen.getByRole("link", { name: /ritmo de esta semana: 6 ventas, esperadas 8, 2 al día/i })).toHaveAttribute("href", "/comercial/resultados/sales");
  });

  it("al ritmo de la semana lo dice con su píldora", () => {
    const series = pace.series.map((point) => (point.date === "2026-09-23" ? { ...point, sales: 30 } : point));
    render(<WeekTile pace={{ ...pace, series }} href="/x" />);
    expect(screen.getByText("Al ritmo")).toBeInTheDocument();
  });

  it("sin puntos de la semana de hoy no ocupa sitio", () => {
    const { container } = render(<WeekTile pace={{ ...pace, series: [] }} href="/x" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("TicketTile (antes la fila bajo «Ventas»)", () => {
  it("real contra plan, cuánto se desvía y de dónde sale el del plan; abre el detalle del ticket", () => {
    render(<TicketTile pace={pace} plan={plan} href="/comercial/resultados/avg_ticket" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/comercial/resultados/avg_ticket");
    expect(link).toHaveTextContent("$ 701.000");
    expect(link).toHaveTextContent("Plan $ 700.000 · vas un 0,1 % por encima");
    expect(link).toHaveTextContent("según tu historia· últimos 90 días· 61 ventas");
    expect(screen.getByText("En plan")).toBeInTheDocument();
  });

  it("por debajo del plan lo dice; sin ventas aún, solo el plan", () => {
    const { unmount } = render(<TicketTile pace={{ ...pace, avg_ticket_actual_cents: 60_000_000 }} plan={plan} href="/x" />);
    expect(screen.getByText("Por debajo del plan")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveTextContent("vas un 14,3 % por debajo");
    unmount();
    render(<TicketTile pace={{ ...pace, avg_ticket_actual_cents: null }} plan={plan} href="/x" />);
    expect(screen.getByRole("link")).toHaveTextContent("Sin ventas aún");
    expect(screen.queryByText("En plan")).toBeNull();
  });

  it("un ticket largo baja un escalón de tamaño: no se sale de la ficha", () => {
    render(<TicketTile pace={{ ...pace, avg_ticket_actual_cents: 1_250_000_000 }} plan={plan} href="/x" />);
    expect(screen.getByText("$ 12.500.000")).toHaveClass("text-3xl");
  });

  it("sin ticket en el plan no hay ficha", () => {
    const { container } = render(<TicketTile pace={pace} plan={{ ...plan, inputs: { ...plan.inputs, avg_ticket_cents: null } }} href="/x" />);
    expect(container).toBeEmptyDOMElement();
  });
});
