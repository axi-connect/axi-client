import { render, screen } from "@testing-library/react";

const tenant = {
  id: "t1", name: "La Espiga", nit: "1", status: "trial", status_reason: null, trial_ends_at: null,
  city: "Bogotá", country_code: "CO", users_count: 1, created_at: "2026-09-25T04:00:00Z",
};
let role: string | null = "super_admin";
let progress: Record<string, unknown> = { isPending: false, isError: false, error: null, data: { trial_usage: null, setup: { steps: [], closed: 0, total: 5, completed: false } } };
const trialProgressCalls: unknown[] = [];

jest.mock("../../../../../infrastructure/api/hooks/use-tenants", () => ({ useTenantQuery: () => ({ data: tenant, isPending: false }) }));
jest.mock("../../../../../infrastructure/auth/use-platform-role", () => ({ usePlatformRole: () => role }));
let latest: Record<string, unknown> = { isPending: false, isError: false, data: { delivery: null } };
const latestCalls: unknown[] = [];
jest.mock("../../../../../infrastructure/api/hooks/use-delivery", () => ({
  useLatestDelivery: (...args: unknown[]) => {
    latestCalls.push(args);
    return latest;
  },
  useDeliveryContext: () => ({ data: undefined }),
  useTrialProgress: (...args: unknown[]) => {
    trialProgressCalls.push(args);
    return progress;
  },
}));
jest.mock("../../../delivery/ResendDeliveryButton", () => ({ ResendDeliveryButton: () => null }));

import { HttpError } from "@/core/api/problem";
import { TenantSummary } from "../TenantSummary";

describe("TenantSummary: las fichas F6 según el rol", () => {
  beforeEach(() => {
    trialProgressCalls.length = 0;
    latestCalls.length = 0;
    latest = { isPending: false, isError: false, data: { delivery: null } };
  });

  it("super_admin ve «Conversaciones de prueba» y «Puesta en marcha»", () => {
    role = "super_admin";
    render(<TenantSummary tenantId="t1" />);
    expect(screen.getByText("Conversaciones de prueba")).toBeInTheDocument();
    expect(screen.getByText("Puesta en marcha")).toBeInTheDocument();
  });

  it("billing_ops: no pide nada de /delivery (403) y lo dice, sin «Aún sin entregar» (B1)", () => {
    role = "billing_ops";
    // Lo que de verdad le llega: la entrega en 403.
    latest = { isPending: false, isError: true, error: new HttpError({ status: 403, code: "auth/forbidden", message: "Forbidden" }), data: undefined };
    render(<TenantSummary tenantId="t1" />);
    expect(trialProgressCalls.at(-1)).toEqual(["t1", { enabled: false }]);
    expect(latestCalls.at(-1)).toEqual(["t1", { enabled: false }]);
    expect(screen.getByText("La entrega la gestiona soporte")).toBeInTheDocument();
    for (const text of ["Conversaciones de prueba", "Puesta en marcha", "Aún sin entregar", "Sin oferta guardada", "Preparar la entrega"]) {
      expect(screen.queryByText(text)).not.toBeInTheDocument();
    }
  });

  it("un 500 de la entrega se dice con reintento, no se confunde con «sin entregar» (B1)", () => {
    role = "super_admin";
    latest = { isPending: false, isError: true, error: new HttpError({ status: 500, code: "internal", message: "boom" }), data: undefined, refetch: jest.fn() };
    render(<TenantSummary tenantId="t1" />);
    expect(screen.getByText("No pudimos leer la entrega")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
    expect(screen.queryByText("Aún sin entregar")).not.toBeInTheDocument();
  });

  it("un 403 de todos modos las oculta, sin mensaje de error", () => {
    role = null;
    progress = { isPending: false, isError: true, error: new HttpError({ status: 403, code: "auth/forbidden", message: "Forbidden" }), data: undefined };
    render(<TenantSummary tenantId="t1" />);
    expect(screen.queryByText("Conversaciones de prueba")).not.toBeInTheDocument();
  });
});
