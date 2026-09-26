import {
  allocationPreview,
  installmentLabel,
  installmentPending,
  nextInstallment,
  planInstallmentLabel,
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
    expect(
      nextInstallment({ installments: [installment({ status: "paid" })] }),
    ).toBeNull();
  });

  it("el anticipo y el saldo se nombran por lo que son; las de en medio, por su número", () => {
    expect(installmentLabel({ kind: "deposit", seq: 1 }, 4)).toBe("Anticipo");
    expect(installmentLabel({ kind: "balance", seq: 4 }, 4)).toBe(
      "Saldo final",
    );
    expect(installmentLabel({ kind: "installment", seq: 2 }, 4)).toBe(
      "Cuota 2 de 4",
    );
  });

  it("lo pendiente de una cuota nunca es negativo", () => {
    expect(installmentPending({ amount_cents: 1_000, paid_cents: 400 })).toBe(
      600,
    );
    expect(installmentPending({ amount_cents: 1_000, paid_cents: 1_200 })).toBe(
      0,
    );
  });
});

describe("planInstallmentLabel (QA premium P4: un solo «Saldo final»)", () => {
  it("tras reprogramar, el saldo viejo cerrado se lee como cuota y solo el último es el saldo", () => {
    const plan = [
      { kind: "deposit" as const, seq: 1 },
      { kind: "balance" as const, seq: 2 },
      { kind: "installment" as const, seq: 3 },
      { kind: "balance" as const, seq: 4 },
    ];
    expect(plan.map((row) => planInstallmentLabel(row, plan))).toEqual([
      "Anticipo",
      "Cuota 2 de 4",
      "Cuota 3 de 4",
      "Saldo final",
    ]);
  });

  it("sin reprogramar, el único saldo sigue siendo «Saldo final»", () => {
    const plan = [
      { kind: "deposit" as const, seq: 1 },
      { kind: "installment" as const, seq: 2 },
      { kind: "balance" as const, seq: 3 },
    ];
    expect(planInstallmentLabel(plan[2], plan)).toBe("Saldo final");
    expect(planInstallmentLabel(plan[1], plan)).toBe("Cuota 2 de 3");
  });
});

describe("allocationPreview (premium P4: la misma regla FIFO del servidor)", () => {
  const plan = [
    installment({
      id: "d",
      seq: 1,
      kind: "deposit",
      amount_cents: 1_000,
      paid_cents: 1_000,
      status: "paid",
    }),
    installment({
      id: "c",
      seq: 2,
      kind: "installment",
      amount_cents: 1_000,
      paid_cents: 200,
      status: "partially_paid",
    }),
    installment({
      id: "s",
      seq: 3,
      kind: "balance",
      amount_cents: 1_000,
      paid_cents: 0,
      status: "pending",
    }),
  ];

  it("primero lo que vence antes y hasta lo que le falta; lo pagado no entra", () => {
    const { lines, unallocated_cents } = allocationPreview(plan, 1_300);
    expect(
      lines.map((line) => [
        line.installment.id,
        line.applied_cents,
        line.left_cents,
        line.state,
      ]),
    ).toEqual([
      ["c", 800, 0, "settled"],
      ["s", 500, 500, "partial"],
    ]);
    expect(unallocated_cents).toBe(0);
  });

  it("un abono corto deja intacta la siguiente, y uno largo dice lo que sobra", () => {
    expect(
      allocationPreview(plan, 300).lines.map((line) => line.state),
    ).toEqual(["partial", "untouched"]);
    expect(allocationPreview(plan, 2_000).unallocated_cents).toBe(200);
  });
});
