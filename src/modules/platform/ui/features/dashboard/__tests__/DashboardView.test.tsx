import { render, screen } from "@testing-library/react";
import { HttpError } from "@/core/api/problem";
import { DashboardView } from "../DashboardView";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const tenant = (id: string, status: string, users: number) => ({
  id,
  name: `Tenant ${id}`,
  nit: `90${id}`,
  status,
  city: null,
  country_code: "CO",
  users_count: users,
  created_at: `2026-07-0${id.slice(-1)}T00:00:00Z`,
});

jest.mock("../../../../infrastructure/api/hooks/use-tenants", () => ({
  useTenantsQuery: () => ({
    data: {
      data: [
        tenant("t-1", "active", 12),
        tenant("t-2", "active", 3),
        tenant("t-3", "trial", 2),
        tenant("t-4", "suspended", 8),
      ],
      meta: { total: 4 },
    },
    isPending: false,
    isSuccess: true,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock("../../../../infrastructure/api/hooks/use-analytics", () => ({
  useTriggeredAlertsCount: () => ({ data: 7 }),
  // La card de salud falla: el resto del dashboard debe sobrevivir.
  useAgentsHealthQuery: () => ({
    data: undefined,
    isPending: false,
    isError: true,
    error: new HttpError({ status: 500, code: "internal/unexpected", message: "boom" }),
    refetch: jest.fn(),
    dataUpdatedAt: 0,
  }),
  useAlertsQuery: () => ({
    data: { data: [], meta: { total: 7, page: 1, page_size: 50, degraded: false } },
    isPending: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

describe("DashboardView", () => {
  it("los KPIs cuadran con la lista de tenants y las alertas triggered", () => {
    render(<DashboardView />);

    // El label del tile es el <p> uppercase (el texto puede repetirse en
    // badges de otras cards, p.ej. "Trial" en tenants recientes).
    const tile = (label: string) => {
      const labelEl = screen
        .getAllByText(label)
        .find((el) => el.tagName === "P" && el.className.includes("uppercase"))!;
      return labelEl.closest("div")!.parentElement!.textContent;
    };

    expect(tile("Tenants")).toContain("4");
    expect(tile("Activos")).toContain("2");
    expect(tile("Trial")).toContain("1");
    expect(tile("Suspendidos")).toContain("1");
    expect(tile("Alertas activas")).toContain("7");
    expect(tile("Usuarios totales")).toContain("25"); // 12+3+2+8
  });

  it("una card en error muestra su ProblemAlert inline sin tumbar el resto", () => {
    render(<DashboardView />);

    // La card de salud falló…
    expect(screen.getByText(/error inesperado|boom/i)).toBeInTheDocument();
    // …pero alertas recientes y tenants recientes siguen vivas.
    expect(screen.getByText(/sin alertas activas/i)).toBeInTheDocument();
    expect(screen.getByText("Tenants recientes")).toBeInTheDocument();
    expect(screen.getByText("Tenant t-1")).toBeInTheDocument();
  });
});
