import {
  BULK_LIMITS,
  bulkDayLoads,
  bulkFinishesAt,
  bulkPromise,
  bulkSpanHours,
  exceedsDailyCap,
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
