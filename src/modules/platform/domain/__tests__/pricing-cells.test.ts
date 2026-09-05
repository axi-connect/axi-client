import {
  ANNUAL_MONTHS_BILLED,
  deriveCells,
  discountedCents,
  inferPackageFee,
  perConversationCop,
  runGate,
  type PackageComponent,
  type TierComponent,
} from "../pricing-cells";

const PACKAGES: PackageComponent[] = [
  { planId: "p-esencial", slug: "esencial", name: "Esencial", feeCents: 90_000_00 },
  { planId: "p-crecimiento", slug: "crecimiento", name: "Crecimiento", feeCents: 200_000_00 },
  { planId: "p-escala", slug: "escala", name: "Escala", feeCents: 400_000_00 },
];

const TIERS: TierComponent[] = [
  { code: "t500", conversations: 500, label: "500", feeCents: 99_900_00, isActive: true },
  { code: "t1000", conversations: 1_000, label: "1.000", feeCents: 169_900_00, isActive: true },
  { code: "t2500", conversations: 2_500, label: "2.500", feeCents: 359_900_00, isActive: true },
  { code: "t5000", conversations: 5_000, label: "5.000", feeCents: 649_900_00, isActive: true },
  { code: "t10000", conversations: 10_000, label: "10.000", feeCents: 1_149_900_00, isActive: true },
  { code: "t25000", conversations: 25_000, label: "25.000", feeCents: 2_499_900_00, isActive: true },
];

describe("pricing-cells", () => {
  it("deriva 36 celdas: 3 paquetes × 6 tramos × 2 intervalos, todas en .900", () => {
    const cells = deriveCells(PACKAGES, TIERS);
    expect(cells).toHaveLength(36);
    const monthly = cells.filter((cell) => cell.interval === "monthly");
    for (const cell of monthly) expect((cell.amountCents / 100) % 1_000).toBe(900);
    expect(monthly.find((c) => c.planSlug === "esencial" && c.tierCode === "t500")?.amountCents).toBe(
      189_900_00,
    );
  });

  it("el anual factura once meses de doce", () => {
    const cells = deriveCells(PACKAGES, TIERS);
    const annual = cells.find((c) => c.planSlug === "escala" && c.tierCode === "t2500" && c.interval === "annual");
    expect(ANNUAL_MONTHS_BILLED).toBe(11);
    expect(annual?.amountCents).toBe(759_900_00 * 11);
  });

  it("un tramo sin tarifa o inactivo no produce celdas", () => {
    const tiers: TierComponent[] = [
      ...TIERS,
      { code: "t50000", conversations: 50_000, label: "50.000", feeCents: null, isActive: true },
      { code: "t100", conversations: 100, label: "100", feeCents: 49_900_00, isActive: false },
    ];
    expect(deriveCells(PACKAGES, tiers)).toHaveLength(36);
  });

  it("una anulación con motivo reemplaza la suma y queda marcada", () => {
    const cells = deriveCells(PACKAGES, TIERS, {
      "escala|t25000": { amountCents: 2_799_900_00, reason: "Piso de Enterprise" },
    });
    const cell = cells.find((c) => c.planSlug === "escala" && c.tierCode === "t25000" && c.interval === "monthly");
    expect(cell).toMatchObject({
      amountCents: 2_799_900_00,
      derivedCents: 2_899_900_00,
      overrideReason: "Piso de Enterprise",
    });
  });

  it("reconstruye la tarifa de paquete desde una celda publicada y su tramo", () => {
    const published = [
      {
        plan_id: "p-crecimiento",
        interval: "monthly" as const,
        amount_cents: 369_900_00,
        volume_tier: { code: "t1000" },
        override_reason: null,
      },
    ];
    expect(inferPackageFee(published, "p-crecimiento", TIERS)).toBe(200_000_00);
    expect(inferPackageFee(published, "p-escala", TIERS)).toBeNull();
  });

  describe("runGate", () => {
    it("los componentes de la casa pasan la verja estructural y dejan el margen pendiente", () => {
      const gate = runGate(PACKAGES, TIERS);
      expect(gate.filter((check) => check.ok === true).map((check) => check.key)).toEqual([
        "additivity",
        "rounding",
        "monotonic",
        "decreasing",
      ]);
      expect(gate.find((check) => check.key === "margin")?.ok).toBeNull();
    });

    it("detecta una celda fuera de .900 cuando el paquete no va en millares", () => {
      const gate = runGate([{ ...PACKAGES[0], feeCents: 89_900_00 }, PACKAGES[1], PACKAGES[2]], TIERS);
      expect(gate.find((check) => check.key === "rounding")?.ok).toBe(false);
    });

    it("detecta una escalera rota entre paquetes", () => {
      const gate = runGate([PACKAGES[0], { ...PACKAGES[1], feeCents: 500_000_00 }, PACKAGES[2]], TIERS);
      expect(gate.find((check) => check.key === "monotonic")?.ok).toBe(false);
    });

    it("detecta un tramo que cobra más por conversación que el anterior", () => {
      const tiers = TIERS.map((tier) =>
        tier.code === "t1000" ? { ...tier, feeCents: 249_900_00 } : tier,
      );
      expect(runGate(PACKAGES, tiers).find((check) => check.key === "decreasing")?.ok).toBe(false);
    });
  });

  it("el precio por conversación baja de 200 a 100 pesos", () => {
    expect(perConversationCop(TIERS[0])).toBeCloseTo(199.8);
    expect(perConversationCop(TIERS[5])).toBeCloseTo(99.996);
  });

  it("el descuento al .900 inferior coincide con el servidor", () => {
    expect(discountedCents(189_900_00, 4_000, "floor_900")).toBe(113_900_00);
    expect(discountedCents(2_899_900_00, 4_000, "floor_900")).toBe(1_739_900_00);
    expect(discountedCents(100_000_00, 2_500, "none")).toBe(75_000_00);
  });
});
