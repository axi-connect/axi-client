import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { FeatureDetailDTO } from "@/shared/auth/features.store";

const feature = (overrides: Partial<FeatureDetailDTO> = {}): FeatureDetailDTO => ({
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

const mockFeatures = jest.fn<
  { features: FeatureDetailDTO[] | null; loaded: boolean; refresh: () => Promise<void> },
  []
>();
jest.mock("@/shared/auth/features.hooks", () => ({ useFeatures: () => mockFeatures() }));

const mockSetState = jest.fn();
jest.mock("@/shared/auth/features.store", () => ({
  useFeaturesStore: { setState: (...args: unknown[]) => mockSetState(...args) },
}));

const mockEntitlements = jest.fn<{ loaded: boolean; hasCapability: (c: string) => boolean }, []>();
jest.mock("@/shared/auth/entitlements.hooks", () => ({ useEntitlements: () => mockEntitlements() }));

jest.mock("@/modules/companies/infrastructure/hooks/use-my-company", () => ({
  useMyCompany: () => ({ company: { niche_code: "hotels_tourism" } }),
}));

const mockHasPermission = jest.fn<boolean, [string]>();
jest.mock("@/core/providers/auth-provider", () => ({
  useAuthContext: () => ({ hasPermission: (p: string) => mockHasPermission(p) }),
}));

const mockShowAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: mockShowAlert }),
}));

const mockSetTenantFeature = jest.fn<Promise<{ features: FeatureDetailDTO[] }>, [string, boolean]>();
jest.mock("@/modules/companies/infrastructure/services/features-service.adapter", () => ({
  setTenantFeature: (code: string, enabled: boolean) => mockSetTenantFeature(code, enabled),
}));

import { FeaturesTab } from "@/modules/companies/ui/components/settings/FeaturesTab";

describe("FeaturesTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockEntitlements.mockReturnValue({ loaded: true, hasCapability: () => true });
    mockFeatures.mockReturnValue({
      features: [feature()],
      loaded: true,
      refresh: jest.fn().mockResolvedValue(undefined) as unknown as () => Promise<void>,
    });
  });

  it("mientras carga muestra el skeleton, no una lista vacía", () => {
    mockFeatures.mockReturnValue({ features: null, loaded: false, refresh: jest.fn() as never });
    render(<FeaturesTab />);

    expect(screen.getByRole("status", { name: /Cargando funciones/ })).toBeInTheDocument();
    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("dice de dónde sale cada función: el nicho la sugiere", () => {
    render(<FeaturesTab />);
    expect(screen.getByText(/Sugerida por Hoteles y turismo/)).toBeInTheDocument();
  });

  it("una función fijada por Axi no se puede tocar y lo explica", () => {
    mockFeatures.mockReturnValue({
      features: [feature({ code: "documents", label: "Documentos", enabled: false, source: "platform", locked: true })],
      loaded: true,
      refresh: jest.fn() as never,
    });
    render(<FeaturesTab />);

    expect(screen.getByRole("switch", { name: "Documentos" })).toBeDisabled();
    expect(screen.getByText(/Axi la fijó para este negocio/)).toBeInTheDocument();
  });

  it("una función bloqueada por su dependencia dice qué hay que encender antes", () => {
    mockFeatures.mockReturnValue({
      features: [
        feature({ code: "payment_plans", label: "Planes de pago", enabled: false, source: "tenant" }),
        feature({
          code: "collections",
          label: "Cobranza",
          enabled: false,
          source: "niche",
          blocked_by: { kind: "feature", code: "payment_plans" },
          requires: ["payment_plans"],
        }),
      ],
      loaded: true,
      refresh: jest.fn() as never,
    });
    render(<FeaturesTab />);

    expect(screen.getByText(/Se activará cuando enciendas «Planes de pago»/)).toBeInTheDocument();
    // Se puede encender igual: el toggle expresa intención (no 409)
    expect(screen.getByRole("switch", { name: "Cobranza" })).toBeEnabled();
  });

  it("sin la capacidad del plan se explica y el interruptor queda bloqueado", () => {
    mockEntitlements.mockReturnValue({ loaded: true, hasCapability: () => false });
    mockFeatures.mockReturnValue({
      features: [feature({ enabled: false, blocked_by: { kind: "capability", code: "sales" } })],
      loaded: true,
      refresh: jest.fn() as never,
    });
    render(<FeaturesTab />);

    // Dos avisos distintos y complementarios: el del panel entero y el de la fila
    expect(screen.getAllByText(/Tu plan no incluye/)).toHaveLength(2);
    expect(screen.getByText(/puedes verlas, pero no encenderlas/)).toBeInTheDocument();
    expect(screen.getByText(/queda apagada aunque la enciendas/)).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Planes de pago" })).toBeDisabled();
  });

  it("apagar repinta con lo que devuelve el servidor, no con lo que supuso la vista", async () => {
    const afterToggle = [
      feature({ enabled: false, source: "tenant" }),
      feature({ code: "collections", label: "Cobranza", enabled: false, source: "niche", blocked_by: { kind: "feature", code: "payment_plans" } }),
    ];
    mockSetTenantFeature.mockResolvedValue({ features: afterToggle });
    render(<FeaturesTab />);

    fireEvent.click(screen.getByRole("switch", { name: "Planes de pago" }));

    expect(mockSetTenantFeature).toHaveBeenCalledWith("payment_plans", false);
    await waitFor(() => {
      expect(mockSetState).toHaveBeenCalledWith({ features: afterToggle, status: "ready" });
    });
  });

  it("sin permiso `features:manage` se ve pero no se cambia", () => {
    mockHasPermission.mockReturnValue(false);
    render(<FeaturesTab />);
    expect(screen.getByRole("switch", { name: "Planes de pago" })).toBeDisabled();
  });
});
