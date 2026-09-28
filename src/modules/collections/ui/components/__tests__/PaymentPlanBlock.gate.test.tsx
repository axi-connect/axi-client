import { render, screen } from "@testing-library/react";

// Deuda D1: sin la función `collections` (o sin `collections:read`, o sin que
// hayan cargado las funciones) el bloque NO pide el plan: el 403 salía igual.
const mockPlan = jest.fn<Promise<never>, [string]>(() => new Promise(() => {}));
jest.mock("@/modules/collections/infrastructure/services/collections-service.adapter", () => ({
  getPlanByOrder: (orderId: string) => mockPlan(orderId),
}));
let permissions: string[] = ["collections:read"];
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: (permission: string) => permissions.includes(permission) }),
}));
let features = { loaded: true, on: true };
jest.mock("@/shared/auth/features.hooks", () => ({
  useFeatures: () => ({ loaded: features.loaded, hasFeature: (code: string) => code === "collections" && features.on }),
}));
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert: jest.fn() }) }));

import { PaymentPlanBlock } from "@/modules/collections/ui/components/PaymentPlanBlock";

beforeEach(() => {
  mockPlan.mockClear();
  permissions = ["collections:read"];
  features = { loaded: true, on: true };
});

describe("PaymentPlanBlock — solo pide el plan si el negocio tiene Cobros (deuda D1)", () => {
  it("con la función y el permiso: 1 llamada", () => {
    render(<PaymentPlanBlock orderId="o1" />);
    expect(mockPlan).toHaveBeenCalledTimes(1);
    expect(mockPlan).toHaveBeenCalledWith("o1");
  });

  it("sin la función collections: 0 llamadas y la sección no existe", () => {
    features = { loaded: true, on: false };
    const { container } = render(<PaymentPlanBlock orderId="o1" />);
    expect(mockPlan).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it("sin collections:read: 0 llamadas", () => {
    permissions = [];
    render(<PaymentPlanBlock orderId="o1" />);
    expect(mockPlan).not.toHaveBeenCalled();
  });

  it("mientras las funciones cargan: 0 llamadas (se ve la silueta); al cargar con la función, 1", () => {
    features = { loaded: false, on: false };
    const { rerender } = render(<PaymentPlanBlock orderId="o1" />);
    expect(mockPlan).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "Plan de pagos" })).not.toBeInTheDocument();
    features = { loaded: true, on: true };
    rerender(<PaymentPlanBlock orderId="o1" />);
    expect(mockPlan).toHaveBeenCalledTimes(1);
  });
});
