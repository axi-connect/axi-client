import { buildRrule, describeRrule, parseRrule, type RecurrenceConfig } from "../recurrence";

describe("recurrence — buildRrule", () => {
  it("semanal con días y hora", () => {
    expect(
      buildRrule({ freq: "WEEKLY", byWeekdays: ["MO", "WE"], hour: 9, minute: 0 }),
    ).toBe("FREQ=WEEKLY;BYDAY=MO,WE;BYHOUR=9;BYMINUTE=0");
  });

  it("los días BYDAY salen en orden lunes-primero, sin importar el orden de entrada", () => {
    expect(
      buildRrule({ freq: "WEEKLY", byWeekdays: ["SU", "MO"], hour: 8, minute: 30 }),
    ).toBe("FREQ=WEEKLY;BYDAY=MO,SU;BYHOUR=8;BYMINUTE=30");
  });

  it("semanal SIN días → null (configuración incompleta)", () => {
    expect(buildRrule({ freq: "WEEKLY", byWeekdays: [], hour: 9, minute: 0 })).toBeNull();
  });

  it("mensual valida el día 1–28 (evita meses cortos)", () => {
    expect(buildRrule({ freq: "MONTHLY", byMonthDay: 28, hour: 10, minute: 0 })).toBe(
      "FREQ=MONTHLY;BYMONTHDAY=28;BYHOUR=10;BYMINUTE=0",
    );
    expect(buildRrule({ freq: "MONTHLY", byMonthDay: 31, hour: 10, minute: 0 })).toBeNull();
  });

  it("hora/minuto fuera de rango → null", () => {
    expect(buildRrule({ freq: "DAILY", hour: 24, minute: 0 })).toBeNull();
    expect(buildRrule({ freq: "DAILY", hour: 9, minute: 60 })).toBeNull();
  });
});

describe("recurrence — parseRrule (inversa del subset)", () => {
  const cases: RecurrenceConfig[] = [
    { freq: "DAILY", hour: 7, minute: 15 },
    { freq: "WEEKLY", byWeekdays: ["TU", "TH"], hour: 9, minute: 0 },
    { freq: "MONTHLY", byMonthDay: 1, hour: 10, minute: 30 },
  ];

  it.each(cases)("round-trip build→parse conserva la configuración (%s)", (config) => {
    const rrule = buildRrule(config);
    expect(rrule).not.toBeNull();
    expect(parseRrule(rrule!)).toEqual(config);
  });

  it("rrules fuera del subset del panel → null", () => {
    expect(parseRrule("FREQ=YEARLY;BYHOUR=9;BYMINUTE=0")).toBeNull(); // freq ajena
    expect(parseRrule("FREQ=WEEKLY;BYDAY=MO;BYHOUR=9;BYMINUTE=0;UNTIL=20261231")).toBeNull(); // clave ajena
    expect(parseRrule("FREQ=DAILY")).toBeNull(); // sin hora
    expect(parseRrule("FREQ=WEEKLY;BYDAY=XX;BYHOUR=9;BYMINUTE=0")).toBeNull(); // día inválido
    expect(parseRrule("no-es-una-rrule")).toBeNull();
  });
});

describe("recurrence — describeRrule", () => {
  it("lecturas humanas en español", () => {
    expect(describeRrule("FREQ=DAILY;BYHOUR=7;BYMINUTE=0")).toBe("Todos los días a las 7:00 a. m.");
    expect(describeRrule("FREQ=WEEKLY;BYDAY=MO,WE;BYHOUR=9;BYMINUTE=0")).toBe(
      "Cada semana, los lunes y los miércoles a las 9:00 a. m.",
    );
    expect(describeRrule("FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=14;BYMINUTE=30")).toBe(
      "Cada mes, el día 1 a las 2:30 p. m.",
    );
  });

  it("regla ajena al subset → null (la UI muestra la rrule cruda)", () => {
    expect(describeRrule("FREQ=YEARLY;BYHOUR=9;BYMINUTE=0")).toBeNull();
  });
});
