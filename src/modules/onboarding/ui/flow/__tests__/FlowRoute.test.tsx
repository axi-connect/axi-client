import { act, fireEvent, render, screen } from "@testing-library/react";
import { Bot, Clock, Package, Sparkles, Store } from "lucide-react";

import { FlowRoute, type FlowStop } from "@/modules/onboarding/ui/flow/FlowRoute";

const reducedMotion = jest.fn<boolean, []>(() => false);
jest.mock("framer-motion", () => {
  const actual = jest.requireActual<typeof import("framer-motion")>("framer-motion");
  return { ...actual, useReducedMotion: () => reducedMotion() };
});

const STOPS: readonly FlowStop[] = [
  { code: "niche", label: "Negocio", icon: Store, status: "done" },
  { code: "hours", label: "Horario", icon: Clock, status: "skipped" },
  { code: "catalog", label: "Catálogo", icon: Package, status: "pending" },
  { code: "agents", label: "Agentes", icon: Bot, status: "pending" },
  { code: "done", label: "Listo", icon: Sparkles },
];

describe("FlowRoute", () => {
  beforeEach(() => {
    reducedMotion.mockReturnValue(false);
    jest.useRealTimers();
  });

  it("dibuja una parada por paso aunque jsdom no mida el ancho, con la activa como paso actual", () => {
    render(<FlowRoute stops={STOPS} current={2} onJump={jest.fn()} ariaLabel="Recorrido de la configuración" />);
    const nav = screen.getByRole("navigation", { name: /recorrido de la configuración/i });
    expect(nav.querySelector("path.flow-route-path")).not.toBeNull();
    expect(screen.getByLabelText("Catálogo")).toHaveAttribute("aria-current", "step");
    expect(screen.getByLabelText("Agentes")).not.toHaveAttribute("aria-current");
  });

  it("las paradas cerradas son botones para volver, con «para después» en las omitidas; las pendientes no", () => {
    const onJump = jest.fn();
    render(<FlowRoute stops={STOPS} current={2} onJump={onJump} ariaLabel="Recorrido" />);
    fireEvent.click(screen.getByRole("button", { name: "Volver a Negocio" }));
    expect(onJump).toHaveBeenCalledWith(0);
    const skipped = screen.getByRole("button", { name: "Volver a Horario (para después)" });
    expect(skipped.className).toContain("flow-stop--skipped");
    expect(screen.queryByRole("button", { name: /agentes/i })).toBeNull();
  });

  it("sin `status` deduce lo recorrido por posición (el registro)", () => {
    const plain = STOPS.map(({ code, label, icon }) => ({ code, label, icon }));
    render(<FlowRoute stops={plain} current={2} onJump={jest.fn()} ariaLabel="Recorrido del registro" />);
    expect(screen.getByRole("button", { name: "Volver a Negocio" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Volver a Horario" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /catálogo/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /agentes/i })).toBeNull();
  });

  it("con `celebrate` enciende las hechas una a una y nunca las omitidas", () => {
    jest.useFakeTimers();
    const stops: FlowStop[] = STOPS.map((stop, index) => (index < 4 ? { ...stop, status: index === 1 ? "skipped" : "done" } : stop));
    render(<FlowRoute stops={stops} current={4} onJump={jest.fn()} ariaLabel="Recorrido" celebrate />);
    const lit = () => document.querySelectorAll(".flow-stop--lit").length;
    expect(lit()).toBe(0);
    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(lit()).toBe(1);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    // Negocio, Catálogo, Agentes y la parada activa «Listo»; Horario (omitida) queda apagada.
    expect(lit()).toBe(4);
    expect(screen.getByRole("button", { name: /horario/i }).className).not.toContain("flow-stop--lit");
  });

  it("con reduced-motion todo aparece encendido de una vez", () => {
    reducedMotion.mockReturnValue(true);
    const stops: FlowStop[] = STOPS.map((stop, index) => (index < 4 ? { ...stop, status: "done" } : stop));
    render(<FlowRoute stops={stops} current={4} onJump={jest.fn()} ariaLabel="Recorrido" celebrate />);
    expect(document.querySelectorAll(".flow-stop--lit").length).toBe(5);
  });
});
