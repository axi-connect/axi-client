import { render, screen } from "@testing-library/react";

import { NewCustomersCard } from "../NewCustomersCard";
import type { ContactStatsDTO } from "@/modules/dashboard/domain/dashboard";

const weekStats: ContactStatsDTO = {
  period: "7d",
  period_start: "2026-09-17T05:00:00Z",
  period_end: "2026-09-24T05:00:00Z",
  new_count: 64,
  by_stage: { prospect: 38, lead: 17, customer: 9, other: 0 },
  series: [8, 11, 9, 7, 12, 9, 8].map((count, i) => ({ bucket: `2026-09-${String(17 + i)}T12:00:00Z`, count })),
};

describe("NewCustomersCard", () => {
  it("recién cambiado a «Hoy», el dato de 7 días sigue con su nombre y la ficha se anuncia ocupada (auditoría P2-4)", () => {
    render(<NewCustomersCard section={{ status: "loading", data: weekStats, error: null }} period="today" onRetry={jest.fn()} />);
    expect(screen.getByRole("heading", { name: "Clientes nuevos en 7 días" })).toBeInTheDocument();
    expect(screen.getByText("64")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Clientes nuevos en 7 días" }).closest("section")).toHaveAttribute("aria-busy", "true");
  });

  it("con el dato al día no está ocupada y el reparto usa las etiquetas del CRM", () => {
    render(<NewCustomersCard section={{ status: "ready", data: weekStats, error: null }} period="7d" onRetry={jest.fn()} />);
    expect(screen.getByRole("heading", { name: "Clientes nuevos en 7 días" }).closest("section")).not.toHaveAttribute("aria-busy");
    expect(screen.getByText("Prospecto")).toBeInTheDocument();
  });

  it("sin dato todavía, la etiqueta es la del período elegido", () => {
    render(<NewCustomersCard section={{ status: "loading", data: null, error: null }} period="today" onRetry={jest.fn()} />);
    expect(screen.getByRole("heading", { name: "Clientes nuevos hoy" })).toBeInTheDocument();
  });
});
