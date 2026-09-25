import { render, screen } from "@testing-library/react";

const tenant = {
  id: "019fa9ac-afde-7792-846f-a0527b58ab85",
  name: "Panadería La Espiga",
  nit: "901999888",
  status: "trial",
  status_reason: null,
  trial_ends_at: null,
  city: "Bogotá",
  country_code: "CO",
  users_count: 1,
  created_at: "2026-09-25T04:00:00Z",
};
let latest: { isPending: boolean; data?: { delivery: { status: string } | null } } = { isPending: true };
let role: string | null = "super_admin";

jest.mock("next/navigation", () => ({ usePathname: () => `/platform/tenants/${tenant.id}` }));
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert: jest.fn() }) }));
jest.mock("../../../../../infrastructure/api/hooks/use-tenants", () => ({
  useTenantQuery: () => ({ data: tenant, isPending: false, isError: false, error: null, refetch: jest.fn() }),
  useUpdateTenant: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));
jest.mock("../../../../../infrastructure/api/hooks/use-delivery", () => ({ useLatestDelivery: () => latest }));
jest.mock("../../../../../infrastructure/auth/use-platform-role", () => ({ usePlatformRole: () => role }));
jest.mock("../../TenantRowActions", () => ({ TenantRowActions: () => <button type="button">Más acciones</button> }));
jest.mock("../../SupportSessionDialog", () => ({ SupportSessionDialog: () => null }));

import { TenantHeader } from "../TenantHeader";

describe("TenantHeader: la acción principal según la entrega y el rol", () => {
  it("mientras carga la entrega no pinta ninguna acción (no cambia de golpe, A9)", () => {
    latest = { isPending: true };
    render(<TenantHeader tenantId={tenant.id} />);
    expect(screen.queryByRole("link", { name: /Preparar entrega/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Entrar como soporte/ })).not.toBeInTheDocument();
  });

  it("sin entregar: «Preparar entrega»", () => {
    latest = { isPending: false, data: { delivery: null } };
    render(<TenantHeader tenantId={tenant.id} />);
    expect(screen.getByRole("link", { name: /Preparar entrega/ })).toHaveAttribute("href", `/platform/tenants/${tenant.id}/entrega`);
  });

  it("entregada: «Entrar como soporte»", () => {
    latest = { isPending: false, data: { delivery: { status: "sent" } } };
    role = "super_admin";
    render(<TenantHeader tenantId={tenant.id} />);
    expect(screen.getByRole("button", { name: /Entrar como soporte/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Preparar entrega/ })).not.toBeInTheDocument();
  });

  it("entregada y rol billing_ops: sin acción de soporte", () => {
    latest = { isPending: false, data: { delivery: { status: "sent" } } };
    role = "billing_ops";
    render(<TenantHeader tenantId={tenant.id} />);
    expect(screen.queryByRole("button", { name: /Entrar como soporte/ })).not.toBeInTheDocument();
  });
});
