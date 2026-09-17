import {
  installmentLabel,
  installmentPending,
  nextInstallment,
  planProgress,
  type InstallmentDTO,
} from "@/modules/collections/domain/payment-plan";

const installment = (overrides: Partial<InstallmentDTO> = {}): InstallmentDTO =>
  ({
    id: "i1",
    seq: 1,
    kind: "installment",
    due_at: "2027-01-13",
    amount_cents: 1_000,
    paid_cents: 0,
    status: "pending",
    paid_at: null,
    ...overrides,
  }) as InstallmentDTO;

describe("El plan de pagos en el pedido (F4 Cobros)", () => {
  it("el progreso se mide contra el total del PEDIDO", () => {
    expect(planProgress({ total_cents: 1_000, paid_cents: 300 })).toBe(30);
    // Un sobrepago no dibuja más del 100 %.
    expect(planProgress({ total_cents: 1_000, paid_cents: 1_500 })).toBe(100);
    expect(planProgress({ total_cents: 0, paid_cents: 0 })).toBe(0);
  });

  it("la próxima cuota es la primera sin cubrir, saltando pagadas y anuladas", () => {
    const plan = {
      installments: [
        installment({ id: "a", seq: 1, status: "paid" }),
        installment({ id: "b", seq: 2, status: "waived" }),
        installment({ id: "c", seq: 3, status: "pending" }),
      ],
    };
    expect(nextInstallment(plan)?.id).toBe("c");
  });

  it("un plan cubierto del todo no tiene próxima cuota", () => {
    expect(nextInstallment({ installments: [installment({ status: "paid" })] })).toBeNull();
  });

  it("el anticipo y el saldo se nombran por lo que son; las de en medio, por su número", () => {
    expect(installmentLabel({ kind: "deposit", seq: 1 }, 4)).toBe("Anticipo");
    expect(installmentLabel({ kind: "balance", seq: 4 }, 4)).toBe("Saldo final");
    expect(installmentLabel({ kind: "installment", seq: 2 }, 4)).toBe("Cuota 2 de 4");
  });

  it("lo pendiente de una cuota nunca es negativo", () => {
    expect(installmentPending({ amount_cents: 1_000, paid_cents: 400 })).toBe(600);
    expect(installmentPending({ amount_cents: 1_000, paid_cents: 1_200 })).toBe(0);
  });
});
