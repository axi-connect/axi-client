import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import type { FeatureDetailDTO } from "@/shared/auth/features.store";

const feature = (overrides: Partial<FeatureDetailDTO> = {}): FeatureDetailDTO => ({
  code: "payment_plans",
  label: "Planes de pago",
  description: "",
  enabled: true,
  source: "niche",
  locked: false,
  blocked_by: null,
  requires_capability: "sales",
  requires: [],
  ...overrides,
});

const mockQuery = jest.fn();
const mockMutate = jest.fn<Promise<unknown>, [{ code: string; forced: "on" | "off" | null; reason?: string }]>();
jest.mock("@/modules/platform/infrastructure/api/hooks/use-tenant-features", () => ({
  useTenantFeaturesQuery: () => mockQuery(),
  useSetTenantFeatureOverride: () => ({ mutateAsync: (args: { code: string; forced: "on" | "off" | null; reason?: string }) => mockMutate(args) }),
}));
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert: jest.fn() }) }));

import { TenantFeaturesView } from "@/modules/platform/ui/features/tenants/detail/TenantFeaturesView";

describe("TenantFeaturesView (premium P1: quién decide cada función)", () => {
  beforeEach(() => {
    mockMutate.mockReset().mockResolvedValue({});
    mockQuery.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        features: [
          feature(),
          feature({ code: "fx_quotes", label: "Precios en otra moneda", enabled: false, source: "tenant" }),
          feature({ code: "documents", label: "Documentos del cliente", enabled: false, source: "platform", locked: true }),
        ],
      },
    });
  });

  it("la isla cuenta solo las fijadas por la plataforma y lleva a Auditoría", () => {
    render(<TenantFeaturesView tenantId="t1" />);
    const island = screen.getByRole("region", { name: "Fijadas por la plataforma" });
    expect(island).toHaveTextContent("1de 3 funciones");
    expect(island).toHaveTextContent("Documentos del cliente · forzada apagada");
    expect(within(island).getByRole("link", { name: "Ver en Auditoría" })).toHaveAttribute("href", "/platform/tenants/t1/audit");
  });

  it("la escalera marca SOLO el peldaño que manda, con su valor", () => {
    render(<TenantFeaturesView tenantId="t1" />);
    const fx = screen.getByRole("list", { name: "Quién decide Precios en otra moneda" });
    expect(within(fx).getByText("Apagada")).toBeInTheDocument();
    expect(within(fx).getByText(/manda Tenant/)).toBeInTheDocument();
    // Los que no mandan no dicen un valor que el endpoint no trae
    expect(within(fx).getByText("Tipo de negocio")).toBeInTheDocument();
    expect(within(fx).getByText("Plataforma")).toBeInTheDocument();
  });

  it("forzar exige motivo; un motivo rápido lo escribe y se envía con el override", async () => {
    render(<TenantFeaturesView tenantId="t1" />);
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Override de Planes de pago" })).getByRole("radio", { name: /Forzar OFF/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Forzar" }));
    expect(screen.getByText(/Escribe el motivo/)).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Piloto" }));
    expect(screen.getByLabelText("Motivo")).toHaveValue("Piloto");
    fireEvent.click(screen.getByRole("button", { name: "Forzar" }));
    await waitFor(() => expect(mockMutate).toHaveBeenCalledWith({ code: "payment_plans", forced: "off", reason: "Piloto" }));
  });
});
