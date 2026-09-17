import {
  daysUntilService,
  PAYMENT_STATE_LABELS,
  paymentProgress,
} from "@/modules/orders/domain/order";

const TOTAL = 2_170_315_000;
const ABONO = 651_094_500;

describe("paymentProgress (F3: cuánto lleva cobrado un pedido)", () => {
  it("un tramo por pago verificado, del ancho de su importe", () => {
    const { percent, segments } = paymentProgress({
      total_cents: TOTAL,
      paid_cents: TOTAL,
      payments: [
        { status: "verified", amount_cents: ABONO },
        { status: "verified", amount_cents: TOTAL - ABONO },
      ],
    });
    expect(percent).toBe(100);
    expect(segments).toHaveLength(2);
    expect(Math.round(segments[0])).toBe(30);
    expect(Math.round(segments[0] + segments[1])).toBe(100);
  });

  it("los pagos sin verificar no cuentan: el medidor solo dibuja dinero confirmado", () => {
    const { percent, segments } = paymentProgress({
      total_cents: TOTAL,
      paid_cents: ABONO,
      payments: [
        { status: "verified", amount_cents: ABONO },
        { status: "reported", amount_cents: TOTAL - ABONO },
        { status: "rejected", amount_cents: 999 },
      ],
    });
    expect(percent).toBe(30);
    expect(segments).toHaveLength(1);
  });

  it("sin detalle de pagos cae a un solo tramo con el porcentaje cobrado", () => {
    expect(paymentProgress({ total_cents: TOTAL, paid_cents: ABONO }).segments).toEqual([30]);
    expect(paymentProgress({ total_cents: TOTAL, paid_cents: 0 }).segments).toEqual([]);
  });

  it("un sobrepago no dibuja más del 100 %", () => {
    const { percent, segments } = paymentProgress({
      total_cents: 1_000_000,
      paid_cents: 1_500_000,
      payments: [{ status: "verified", amount_cents: 1_500_000 }],
    });
    expect(percent).toBe(100);
    expect(segments[0]).toBeLessThanOrEqual(100);
  });

  it("un pedido de total cero no divide por cero", () => {
    expect(paymentProgress({ total_cents: 0, paid_cents: 0 }).percent).toBe(0);
    expect(paymentProgress({ total_cents: 0, paid_cents: 100 }).percent).toBe(100);
  });
});

describe("daysUntilService (la salida es lo que urge el saldo)", () => {
  const hoy = new Date("2026-09-17T15:00:00.000Z");

  it("cuenta los días hasta la salida en días completos", () => {
    expect(daysUntilService("2026-09-18", hoy)).toBe(1);
    expect(daysUntilService("2027-03-14", hoy)).toBe(178);
  });

  it("hoy es cero y una salida pasada es negativa", () => {
    expect(daysUntilService("2026-09-17", hoy)).toBe(0);
    expect(daysUntilService("2026-09-10", hoy)).toBe(-7);
  });

  it("sin fecha de servicio no hay cuenta atrás", () => {
    expect(daysUntilService(null, hoy)).toBeNull();
  });
});

describe("PAYMENT_STATE_LABELS", () => {
  it("«abonado» es el estado de cobro, no un estado del pedido", () => {
    expect(PAYMENT_STATE_LABELS.partially_paid).toBe("Abonado");
    expect(PAYMENT_STATE_LABELS.paid).toBe("Pagado");
    expect(PAYMENT_STATE_LABELS.unpaid).toBe("Sin pagos");
  });
});
