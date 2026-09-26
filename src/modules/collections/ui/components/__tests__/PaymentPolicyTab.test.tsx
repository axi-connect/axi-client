import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { CollectionsPolicyDTO } from "@/modules/collections/domain/payment-plan";

const POLICY = {
  deposit_pct: 30,
  installments_strategy: "equal_monthly",
  installments_count: 2,
  final_due_days_before_service: 30,
  min_days_between_installments: 15,
  fallback_term_days: 60,
  min_plan_total_cents: 0,
  grace_days: 3,
  reminder_days_before: [7, 1],
  overdue_reminder_days: [1, 7],
  reminder_channels: { whatsapp: true, email: false },
  pause_on_promise: true,
} as unknown as CollectionsPolicyDTO;

const mockSave = jest.fn<
  Promise<CollectionsPolicyDTO>,
  [CollectionsPolicyDTO]
>();
const mockPreview = jest.fn(() =>
  Promise.resolve({
    installments: [
      {
        seq: 1,
        kind: "deposit",
        due_at: "2026-09-25",
        amount_cents: 4_200_000_00,
      },
      {
        seq: 2,
        kind: "balance",
        due_at: "2027-02-23",
        amount_cents: 9_800_000_00,
      },
    ],
  }),
);
jest.mock(
  "@/modules/collections/infrastructure/services/collections-service.adapter",
  () => ({
    getCollectionsPolicy: () => Promise.resolve(POLICY),
    previewPlan: () => mockPreview(),
    saveCollectionsPolicy: (policy: CollectionsPolicyDTO) => mockSave(policy),
  }),
);
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn() }),
}));

import { PaymentPolicyTab } from "@/modules/collections/ui/components/PaymentPolicyTab";

describe("PaymentPolicyTab (premium P4: filas, isla y barra de tinta)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockImplementation((policy) => Promise.resolve(policy));
  });

  it("la isla muestra el calendario que produce; sin cambios no hay barra de guardar", async () => {
    render(<PaymentPolicyTab />);
    const island = await screen.findByRole("region", {
      name: "El calendario que produce",
    });
    await waitFor(() => expect(island).toHaveTextContent("Anticipo"));
    expect(island).toHaveTextContent("$ 4.200.000");
    expect(island).toHaveTextContent("Saldo final");
    expect(
      screen.queryByRole("contentinfo", { name: "Cambios sin guardar" }),
    ).toBeNull();
  });

  it("subir el anticipo abre la barra, la isla avisa que muestra lo guardado y guardar manda el borrador", async () => {
    render(<PaymentPolicyTab />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Subir anticipo para reservar",
      }),
    );
    expect(screen.getByLabelText("Anticipo para reservar")).toHaveValue("35");
    expect(
      screen.getByRole("contentinfo", { name: "Cambios sin guardar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "El calendario que produce" }),
    ).toHaveTextContent("guarda para ver el de tus cambios");
    fireEvent.click(screen.getByRole("button", { name: "Guardar política" }));
    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ deposit_pct: 35 }),
      ),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("contentinfo", { name: "Cambios sin guardar" }),
      ).toBeNull(),
    );
    // El calendario se vuelve a pedir con la política ya guardada.
    expect(mockPreview).toHaveBeenCalledTimes(2);
  });

  it("«Descartar» vuelve a lo guardado sin llamar al servidor", async () => {
    render(<PaymentPolicyTab />);
    fireEvent.click(await screen.findByRole("radio", { name: "Número fijo" }));
    expect(
      screen.getByLabelText("Cuotas además del anticipo"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(screen.queryByLabelText("Cuotas además del anticipo")).toBeNull();
    expect(
      screen.queryByRole("contentinfo", { name: "Cambios sin guardar" }),
    ).toBeNull();
    expect(mockSave).not.toHaveBeenCalled();
  });
});
