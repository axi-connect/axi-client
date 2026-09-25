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
jest.mock("../../../../../infrastructure/api/hooks/use-delivery", () => ({
  useLatestDelivery: () => ({ isPending: false, data: { delivery: null } }),
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
  beforeEach(() => (trialProgressCalls.length = 0));

  it("super_admin ve «Conversaciones de prueba» y «Puesta en marcha»", () => {
    role = "super_admin";
    render(<TenantSummary tenantId="t1" />);
    expect(screen.getByText("Conversaciones de prueba")).toBeInTheDocument();
    expect(screen.getByText("Puesta en marcha")).toBeInTheDocument();
  });

  it("billing_ops no las pide ni las pinta (el endpoint le responde 403)", () => {
    role = "billing_ops";
    render(<TenantSummary tenantId="t1" />);
    expect(trialProgressCalls.at(-1)).toEqual(["t1", { enabled: false }]);
    expect(screen.queryByText("Conversaciones de prueba")).not.toBeInTheDocument();
    expect(screen.queryByText("Puesta en marcha")).not.toBeInTheDocument();
  });

  it("un 403 de todos modos las oculta, sin mensaje de error", () => {
    role = null;
    progress = { isPending: false, isError: true, error: new HttpError({ status: 403, code: "auth/forbidden", message: "Forbidden" }), data: undefined };
    render(<TenantSummary tenantId="t1" />);
    expect(screen.queryByText("Conversaciones de prueba")).not.toBeInTheDocument();
  });
});
