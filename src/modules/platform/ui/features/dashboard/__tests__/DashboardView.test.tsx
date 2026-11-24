import { render, screen, within } from "@testing-library/react";
import { HttpError } from "@/core/api/problem";
import { DashboardView, latestAlertPhrase } from "../DashboardView";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/platform",
}));

const DAY = 86_400_000;
const inDays = (days: number) => new Date(Date.now() + days * DAY + 3_600_000).toISOString();

const tenant = (id: string, status: string, users: number, extra: Record<string, unknown> = {}) => ({
  id,
  name: `Tenant ${id}`,
  nit: `90${id}`,
  status,
  status_reason: null,
  trial_ends_at: null,
  city: null,
  country_code: "CO",
  users_count: users,
  created_at: `2026-07-0${id.slice(-1)}T00:00:00Z`,
  ...extra,
});

jest.mock("../../../../infrastructure/api/hooks/use-tenants", () => ({
  useTenantsQuery: () => ({
    data: {
      data: [
        tenant("t-1", "active", 12),
        tenant("t-2", "active", 3),
        tenant("t-3", "trial", 2, { trial_ends_at: inDays(1) }),
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

// Saldos de proveedores (alerta de saldos, 24-nov): OpenAI sin saldo y Twilio bajo.
jest.mock("../../../../infrastructure/api/hooks/use-balances", () => ({
  useBalancesQuery: () => ({
    data: {
      worst_level: "critical",
      counts: { critical: 1, warning: 1, ok: 3, unknown: 0 },
      checked_at: "2026-11-24T16:30:00Z",
      providers: [
        {
          id: "openai",
          name: "OpenAI",
          level: "critical",
          balance_usd: 0,
          runway_days: 0,
          incident: { kind: "no_funds", since: "2026-11-24T14:45:00Z" },
        },
        { id: "twilio", name: "Twilio", level: "warning", balance_usd: 18.4, runway_days: 6, incident: null },
        { id: "groq", name: "Groq", level: "ok", balance_usd: null, runway_days: null, incident: null },
        { id: "resend", name: "Resend", level: "ok", balance_usd: null, runway_days: null, incident: null },
        { id: "voyage", name: "Voyage", level: "ok", balance_usd: null, runway_days: null, incident: null },
      ],
    },
    isPending: false,
    isSuccess: true,
    isError: false,
    error: null,
    refetch: jest.fn(),
    dataUpdatedAt: 1,
  }),
}));

jest.mock("../../../../infrastructure/api/hooks/use-intake", () => ({
  useIntakeSessionsQuery: () => ({
    data: undefined,
    isPending: false,
    isError: true,
    error: new Error("caída"),
    refetch: jest.fn(),
  }),
}));

jest.mock("../../../../infrastructure/api/hooks/use-analytics", () => ({
  useTriggeredAlertsCount: () => ({ data: 7, isError: false }),
  // La tarjeta de salud falla: el resto del Inicio debe sobrevivir.
  useAgentsHealthQuery: () => ({
    data: undefined,
    isPending: false,
    isError: true,
    error: new HttpError({ status: 500, code: "internal/unexpected", message: "boom" }),
    refetch: jest.fn(),
    dataUpdatedAt: 0,
  }),
  useAlertsQuery: () => ({
    data: {
      data: [
        {
          id: "a-1",
          company_id: "t-1",
          company_name: "Tenant t-1",
          rule: "ai_failures_spike",
          subject_type: "ai_agent",
          subject_id: null,
          window_start: "2026-11-24T10:00:00Z",
          value_at_trigger: 4,
          threshold: 3,
          status: "triggered",
          created_at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
        },
      ],
      meta: { total: 7, page: 1, page_size: 50, degraded: false },
    },
    isPending: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

const tile = (label: string) => screen.getByRole("heading", { level: 2, name: label }).closest("section")!;

describe("Inicio de la consola", () => {
  it("los 6 datos de siempre cuadran con la lista y las alertas", () => {
    render(<DashboardView />);
    expect(tile("Empresas")).toHaveTextContent("4en la plataforma");
    expect(tile("Empresas")).toHaveTextContent("2 activas · 1 en prueba · 1 suspendida");
    expect(tile("En prueba")).toHaveTextContent("1empresa");
    expect(tile("Alertas activas")).toHaveTextContent("7disparadas");
    expect(tile("Usuarios totales")).toHaveTextContent("25personas"); // 12+3+2+8
  });

  it("encabezado con el grupo, el título y «Nueva empresa»", () => {
    render(<DashboardView />);
    expect(screen.getByText("Inicio")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Plataforma" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nueva empresa" })).toHaveAttribute("href", "/platform/tenants/new");
  });

  it("«Lo próximo» junta alertas y pruebas por vencer, y dice que no pudo leer las entrevistas", () => {
    render(<DashboardView />);
    const island = screen.getByRole("region", { name: "Lo próximo" });
    expect(within(island).getByText("Dos cosas piden tu atención hoy")).toBeInTheDocument();
    expect(within(island).getByText("7 alertas disparadas")).toBeInTheDocument();
    expect(within(island).getByText("Fallos repetidos del agente en Tenant t-1 y 6 más")).toBeInTheDocument();
    expect(within(island).getByText("1 prueba vence esta semana")).toBeInTheDocument();
    expect(within(island).getByText("Tenant t-3 (mañana)")).toBeInTheDocument();
    // Error ≠ vacío: no se afirma que ninguna entrevista espera.
    expect(within(island).getByText("No pudimos leer las entrevistas")).toBeInTheDocument();
  });

  it("una tarjeta en error muestra su error dentro sin tumbar el resto", () => {
    render(<DashboardView />);
    expect(within(tile("Agentes en peor salud")).getByRole("alert")).toBeInTheDocument();
    // La regla se lee con su nombre, el código queda en el title.
    const rule = within(tile("Alertas recientes")).getByText("Fallos repetidos del agente");
    expect(rule).toHaveAttribute("title", "ai_failures_spike");
    expect(within(tile("Empresas recientes")).getByText("Tenant t-1")).toBeInTheDocument();
    expect(within(tile("Empresas recientes")).getAllByText("Activa").length).toBeGreaterThan(0);
  });

  it("la alerta más reciente se dice como persona, sea hora o fecha", () => {
    expect(latestAlertPhrase("hace 3 h")).toBe("La más reciente fue hace 3 h");
    expect(latestAlertPhrase("ayer")).toBe("La más reciente fue ayer");
    expect(latestAlertPhrase("13 oct")).toBe("La más reciente fue el 13 oct");
  });

  it("saldos de proveedores: lo que pide atención primero, con su frase, y cuántos más están bien", () => {
    render(<DashboardView />);
    const card = screen.getByRole("heading", { name: "Saldos de proveedores" }).closest("section");
    if (!card) throw new Error("falta la tarjeta");
    const scoped = within(card);
    expect(scoped.getByRole("link", { name: /OpenAI.*Sin saldo desde/ })).toHaveAttribute(
      "href",
      "/platform/balances?proveedor=openai",
    );
    expect(scoped.getByText(/US\$ 18,40 · 6 días/)).toBeInTheDocument();
    expect(scoped.getByText("3 proveedores más")).toBeInTheDocument();
    expect(scoped.getByRole("link", { name: "Ver saldos" })).toHaveAttribute("href", "/platform/balances");
  });
});
