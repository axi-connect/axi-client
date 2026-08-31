import {
  DEFAULT_AGENT_TASK_SETTINGS,
  describeQuietHours,
  isQuietHour,
  validateAgentTaskSettings,
} from "../agent-task-settings";

describe("describeQuietHours", () => {
  it("el cruce de medianoche dice «del día siguiente» y cuenta bien las horas", () => {
    // Sin esa coletilla, "de 8 p.m. a 8 a.m." se lee como un error de tecleo.
    const described = describeQuietHours(20, 8);

    expect(described).toMatchObject({ silent: true, hours: 12, wraps: true });
    expect(described.text).toContain("del día siguiente");
  });

  it("un rango dentro del mismo día NO dice «del día siguiente»", () => {
    const described = describeQuietHours(1, 6);

    expect(described).toMatchObject({ silent: true, hours: 5, wraps: false });
    expect(described.text).not.toContain("del día siguiente");
  });

  it("start === end es SIN silencio, no 24 horas", () => {
    // El motor hace `if (start === end) return false`. Si la UI dejara al
    // usuario creer lo contrario, guardaría lo opuesto a lo que quería.
    const described = describeQuietHours(20, 20);

    expect(described).toMatchObject({ silent: false, hours: 0 });
    expect(described.text).toContain("Sin horario silencioso");
  });

  it("una sola hora de silencio va en singular", () => {
    expect(describeQuietHours(3, 4).text).toContain("1 hora en silencio");
  });
});

describe("isQuietHour — misma aritmética que el motor", () => {
  it("las cuatro fronteras de un rango que cruza medianoche", () => {
    // 20 → 8: la hora de inicio ES silencio, la de fin NO.
    expect(isQuietHour(20, 20, 8)).toBe(true);
    expect(isQuietHour(23, 20, 8)).toBe(true);
    expect(isQuietHour(0, 20, 8)).toBe(true);
    expect(isQuietHour(7, 20, 8)).toBe(true);
    expect(isQuietHour(8, 20, 8)).toBe(false);
    expect(isQuietHour(19, 20, 8)).toBe(false);
  });

  it("las fronteras de un rango dentro del mismo día", () => {
    expect(isQuietHour(1, 1, 6)).toBe(true);
    expect(isQuietHour(5, 1, 6)).toBe(true);
    expect(isQuietHour(6, 1, 6)).toBe(false);
    expect(isQuietHour(0, 1, 6)).toBe(false);
  });

  it("con start === end ninguna hora es silenciosa", () => {
    for (let hour = 0; hour < 24; hour += 1) {
      expect(isQuietHour(hour, 20, 20)).toBe(false);
    }
  });
});

describe("validateAgentTaskSettings", () => {
  it("los defaults del backend son válidos", () => {
    expect(validateAgentTaskSettings(DEFAULT_AGENT_TASK_SETTINGS)).toEqual({});
  });

  it("marca cada número fuera de rango en su propio campo", () => {
    const errors = validateAgentTaskSettings({
      ...DEFAULT_AGENT_TASK_SETTINGS,
      daily_cap: 0,
      max_attempts: 99,
      max_defer_hours: 0,
    });

    expect(Object.keys(errors).sort()).toEqual([
      "daily_cap",
      "max_attempts",
      "max_defer_hours",
    ]);
  });

  it("NO marca nada por tener la hora de fin antes que la de inicio", () => {
    // Es el caso normal, no un error: prohibirlo rompería la función entera.
    expect(
      validateAgentTaskSettings({
        ...DEFAULT_AGENT_TASK_SETTINGS,
        quiet_start_hour: 20,
        quiet_end_hour: 8,
      }),
    ).toEqual({});
  });

  it("un decimal no cuela como entero", () => {
    expect(
      validateAgentTaskSettings({ ...DEFAULT_AGENT_TASK_SETTINGS, daily_cap: 12.5 }).daily_cap,
    ).toBeDefined();
  });
});
