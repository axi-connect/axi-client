import { render, screen, waitFor } from "@testing-library/react";

import { HttpError } from "@/core/api/problem";

const listPaymentMethods = jest.fn();
jest.mock("@/modules/payments/infrastructure/services/payment-methods-service.adapter", () => ({
  listPaymentMethods: () => listPaymentMethods(),
  deletePaymentMethod: jest.fn(),
  createPaymentMethod: jest.fn(),
  updatePaymentMethod: jest.fn(),
}));
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn(), showModal: jest.fn(), closeModal: jest.fn() }),
}));
jest.mock("@/modules/payments/ui/components/PaymentMethodFormSheet", () => ({
  PaymentMethodFormSheet: () => null,
}));

import { PaymentMethodsTab } from "@/modules/payments/ui/components/PaymentMethodsTab";

describe("PaymentMethodsTab", () => {
  it("vacío: estado con CTA para agregar", async () => {
    listPaymentMethods.mockResolvedValue({ data: [], meta: { total: 0 } });
    render(<PaymentMethodsTab />);
    expect(await screen.findByText("Aún no hay medios de pago")).toBeInTheDocument();
  });

  it("lista ordenada por position con número enmascarado y chip de visibilidad", async () => {
    listPaymentMethods.mockResolvedValue({
      data: [
        { id: "b", kind: "cash", label: "Efectivo", account_holder: null, account_number: null, instructions: null, is_active: true, visible_to_ai: false, position: 1, created_at: "", updated_at: "" },
        { id: "a", kind: "nequi", label: "Nequi principal", account_holder: "Tienda", account_number: "3001234567", instructions: null, is_active: true, visible_to_ai: true, position: 0, created_at: "", updated_at: "" },
      ],
      meta: { total: 2 },
    });
    render(<PaymentMethodsTab />);
    const cards = await screen.findAllByRole("article");
    expect(cards[0]).toHaveAccessibleName("Nequi principal");
    expect(screen.getByText(/•••• 4567/)).toBeInTheDocument();
    expect(screen.getByText("Visible para la IA")).toBeInTheDocument();
    expect(screen.getByText("Solo operadores")).toBeInTheDocument();
  });

  it("403 de capacidad: explica que el plan no incluye ventas", async () => {
    listPaymentMethods.mockRejectedValue(
      new HttpError({
        status: 403,
        code: "entitlements/capability_not_granted",
        message: "Capacidad no concedida",
      }),
    );
    render(<PaymentMethodsTab />);
    await waitFor(() => expect(screen.getByText("Tu plan no incluye ventas")).toBeInTheDocument());
  });
});
