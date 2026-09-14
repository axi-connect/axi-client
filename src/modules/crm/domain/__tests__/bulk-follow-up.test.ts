import {
  BULK_LIMITS,
  bulkDayLoads,
  bulkFinishesAt,
  bulkOpeningCost,
  bulkPromise,
  bulkSpanHours,
  exceedsDailyCap,
  formatUsd,
} from "../bulk-follow-up";

const START = new Date("2026-09-18T14:00:00.000Z");

describe("bulk-follow-up — reparto", () => {
  it("la última sale en la posición que le toca, con la misma aritmética del backend", () => {
    // 268 a 20/hora: 267 huecos de 3 min = 13 h 21 min.
    expect(bulkFinishesAt(START, 20, 268).toISOString()).toBe("2026-09-19T03:21:00.000Z");
    // Un lote de uno empieza y acaba a la vez.
    expect(bulkFinishesAt(START, 20, 1)).toEqual(START);
    expect(bulkFinishesAt(START, 20, 0)).toEqual(START);
  });

  it("acota el ritmo igual que el CHECK de la tabla", () => {
    expect(bulkFinishesAt(START, 0, 2)).toEqual(bulkFinishesAt(START, BULK_LIMITS.per_hour.min, 2));
    expect(bulkFinishesAt(START, 9999, 2)).toEqual(
      bulkFinishesAt(START, BULK_LIMITS.per_hour.max, 2),
    );
  });

  it("las horas que ocupa el lote no cuentan la primera tarea", () => {
    expect(bulkSpanHours(20, 21)).toBe(1);
    expect(bulkSpanHours(20, 1)).toBe(0);
  });

  it("reparte por días naturales para la barra", () => {
    // 20/hora son 480 al día: 500 cruzan al segundo día.
    expect(bulkDayLoads(20, 500)).toEqual([
      { day: 0, count: 480 },
      { day: 1, count: 20 },
    ]);
    expect(bulkDayLoads(20, 0)).toEqual([]);
  });
});

describe("bulk-follow-up — cupo diario", () => {
  it("avisa cuando el lote no cabe en un día del tenant", () => {
    expect(exceedsDailyCap(268, 200)).toEqual({ exceeds: true, days: 2 });
    expect(exceedsDailyCap(150, 200)).toEqual({ exceeds: false, days: 1 });
  });

  it("un cupo sin sentido no divide por cero ni inventa días", () => {
    expect(exceedsDailyCap(100, 0)).toEqual({ exceeds: false, days: 1 });
  });
});

describe("bulk-follow-up — la promesa", () => {
  const base = { agentName: "Axi", eligible: 268, startLabel: "jueves 18 a las 9:00", perHour: 20 };

  it("dice sujeto, número y hora, sin adornos", () => {
    expect(bulkPromise({ ...base, medium: "message" })).toBe(
      "Axi escribirá a 268 contactos desde el jueves 18 a las 9:00, a 20 por hora.",
    );
  });

  it("la llamada con respaldo promete las dos cosas", () => {
    expect(bulkPromise({ ...base, medium: "call_then_message" })).toBe(
      "Axi llamará a 268 contactos desde el jueves 18 a las 9:00, a 20 por hora y, a quien no conteste, le escribirá.",
    );
  });

  it("un solo contacto no dice «1 contactos»", () => {
    expect(bulkPromise({ ...base, eligible: 1, medium: "call" })).toContain("llamará a 1 contacto ");
  });
});

describe("bulk-follow-up — cuánto puede costar abrir el lote", () => {
  it("una utility cuesta la tarifa de utility", () => {
    expect(bulkOpeningCost(268, "utility")).toEqual({
      unit_usd: 0.0008,
      total_usd: 268 * 0.0008,
      category: "utility",
    });
  });

  it("una plantilla de MARKETING cuesta 25× — la cifra cambia de orden de magnitud", () => {
    // El bug que esto fija: el modal multiplicaba por 0,0008 a pelo, así que un
    // lote de 268 con plantilla de marketing se anunciaba como US$0,21 cuando
    // de verdad son US$5,36. Una cifra concreta y equivocada es peor que
    // ninguna, porque el operador decide con ella.
    const cost = bulkOpeningCost(268, "marketing");
    expect(cost.unit_usd).toBe(0.02);
    expect(cost.total_usd).toBeCloseTo(5.36, 2);
    expect(cost.total_usd / bulkOpeningCost(268, "utility").total_usd).toBeCloseTo(25, 0);
  });

  it("sin nadie a quien escribir, no cuesta nada", () => {
    expect(bulkOpeningCost(0, "marketing").total_usd).toBe(0);
    expect(bulkOpeningCost(-3, "utility").total_usd).toBe(0);
  });

  it("la tarifa se lee con cuatro decimales y el total con dos", () => {
    expect(formatUsd(0.0008, 4)).toBe("US$0,0008");
    expect(formatUsd(5.36)).toBe("US$5,36");
  });
});
