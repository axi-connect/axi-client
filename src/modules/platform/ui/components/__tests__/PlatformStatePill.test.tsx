import { render, screen } from "@testing-library/react";
import { PlatformStatePill } from "../PlatformStatePill";
import { StatusBadge } from "../StatusBadge";

describe("PlatformStatePill: un solo estado", () => {
  it("pinta el rótulo humano con el código en el title y el tono en el punto", () => {
    render(<PlatformStatePill status="suspended" subject="tenant" />);
    const pill = screen.getByText("Suspendida").parentElement!;
    expect(pill).toHaveAttribute("data-tone", "destructive");
    expect(pill).toHaveAttribute("title", "suspended");
    // El texto va en foreground: el color solo en el punto (AA).
    expect(pill.className).toContain("text-foreground");
  });

  it("lo transitorio lleva spinner en lugar del punto", () => {
    const { container } = render(<PlatformStatePill status="running" />);
    expect(screen.getByText("En curso")).toBeInTheDocument();
    expect(container.querySelector(".animate-spin")).not.toBeNull();
  });

  it("un estado desconocido sale neutro y crudo", () => {
    render(<PlatformStatePill status="algo_nuevo" />);
    expect(screen.getByText("algo_nuevo").parentElement).toHaveAttribute("data-tone", "neutral");
  });

  it("el StatusBadge de siempre ya pinta la píldora única", () => {
    render(<StatusBadge status="trial" appearance="tint" />);
    expect(screen.getByText("En prueba").parentElement).toHaveAttribute("data-tone", "info");
  });
});
