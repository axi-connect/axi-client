import { render, screen } from "@testing-library/react";

import type { FeatureDetailDTO } from "@/shared/auth/features.store";
import type { SetupSources } from "@/modules/companies/domain/cobros-setup";

const feature = (
  overrides: Partial<FeatureDetailDTO> = {},
): FeatureDetailDTO => ({
  code: "payment_plans",
  label: "Planes de pago",
  description: "Anticipo, cuotas y saldo por pedido",
  enabled: true,
  source: "niche",
  locked: false,
  blocked_by: null,
  requires_capability: "sales",
  requires: [],
  ...overrides,
});

const mockFeatures = jest.fn();
jest.mock("@/shared/auth/features.hooks", () => ({
  useFeatures: () => mockFeatures(),
}));
jest.mock("@/shared/auth/features.store", () => ({
  useFeaturesStore: { setState: jest.fn() },
}));
jest.mock("@/shared/auth/entitlements.hooks", () => ({
  useEntitlements: () => ({ loaded: true, hasCapability: () => true }),
}));
jest.mock("@/modules/companies/infrastructure/hooks/use-my-company", () => ({
  useMyCompany: () => ({ company: { niche_code: "hotels_tourism" } }),
}));
jest.mock("@/core/providers/auth-provider", () => ({
  useAuthContext: () => ({ hasPermission: () => true }),
}));
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn() }),
}));
jest.mock(
  "@/modules/companies/infrastructure/services/features-service.adapter",
  () => ({ setTenantFeature: jest.fn() }),
);

const mockSetup = jest.fn<
  { sources: SetupSources; loaded: boolean },
  [readonly string[]]
>();
jest.mock("@/modules/companies/infrastructure/hooks/use-cobros-setup", () => ({
  useCobrosSetup: (codes: readonly string[]) => mockSetup(codes),
}));

import { FeaturesTab } from "@/modules/companies/ui/components/settings/FeaturesTab";

const collections = (daysBefore: number[]) =>
  ({
    deposit_pct: 30,
    installments_strategy: "single_balance",
    installments_count: 0,
    final_due_days_before_service: 30,
    reminder_days_before: daysBefore,
    overdue_reminder_days: [],
    reminder_channels: { whatsapp: true, email: false },
    templates: {
      due_soon: { enabled: true, body: "" },
      due_today: { enabled: true, body: "" },
      overdue: { enabled: true, body: "" },
    },
  }) as unknown as SetupSources["collections"];

describe("FeaturesTab · puesta en marcha de cobros (premium P1)", () => {
  beforeEach(() => {
    mockFeatures.mockReturnValue({
      features: [
        feature(),
        feature({
          code: "collections",
          label: "Cobranza",
          requires: ["payment_plans"],
        }),
      ],
      loaded: true,
      refresh: jest.fn(),
    });
  });

  it("con los recordatorios sin cadencia, la isla los nombra y lleva a configurarlos", () => {
    mockSetup.mockReturnValue({
      loaded: true,
      sources: { collections: collections([]), fx: null, documents: null },
    });
    render(<FeaturesTab />);
    const island = screen.getByRole("region", {
      name: "Puesta en marcha de cobros",
    });
    expect(island).toHaveTextContent("Faltan los recordatorios");
    expect(island).toHaveTextContent("1de 2 listas");
    expect(
      screen.getByRole("link", { name: "Configurar recordatorios" }),
    ).toHaveAttribute("href", "/settings/payments/recordatorios");
    // Solo se piden los ajustes de lo encendido
    expect(mockSetup).toHaveBeenLastCalledWith([
      "payment_plans",
      "collections",
    ]);
  });

  it("con todo configurado dice que está listo y NO ofrece un CTA vacío", () => {
    mockSetup.mockReturnValue({
      loaded: true,
      sources: { collections: collections([7]), fx: null, documents: null },
    });
    render(<FeaturesTab />);
    expect(
      screen.getByRole("region", { name: "Puesta en marcha de cobros" }),
    ).toHaveTextContent("Todo listo para cobrar");
    expect(screen.queryByRole("link", { name: /^Configurar/ })).toBeNull();
    // Y cada ficha dice dónde se ve lo configurado
    expect(
      screen.getByRole("link", { name: "Ver en Recordatorios" }),
    ).toHaveAttribute("href", "/settings/payments/recordatorios");
  });

  it("mientras lee los ajustes no pinta un pendiente que quizá no existe", () => {
    mockSetup.mockReturnValue({
      loaded: false,
      sources: { collections: null, fx: null, documents: null },
    });
    render(<FeaturesTab />);
    expect(
      screen.getByRole("status", { name: "Revisando la configuración" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Faltan los recordatorios")).toBeNull();
    expect(screen.queryByRole("link", { name: /^Configurar/ })).toBeNull();
  });

  it("una función en espera por su dependencia no cuenta como encendida para la puesta en marcha", () => {
    mockFeatures.mockReturnValue({
      features: [
        feature({ enabled: false, source: "tenant" }),
        feature({
          code: "collections",
          label: "Cobranza",
          blocked_by: { kind: "feature", code: "payment_plans" },
        }),
      ],
      loaded: true,
      refresh: jest.fn(),
    });
    mockSetup.mockReturnValue({
      loaded: true,
      sources: { collections: null, fx: null, documents: null },
    });
    render(<FeaturesTab />);
    expect(mockSetup).toHaveBeenLastCalledWith([]);
    expect(
      screen.getByRole("region", { name: "Puesta en marcha de cobros" }),
    ).toHaveTextContent("Nada encendido");
    expect(screen.getByText("En espera")).toBeInTheDocument();
  });
});
