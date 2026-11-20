import {
  coldBrakes,
  describeChanges,
  formatHour,
  isCold,
  isHighRisk,
  modeOptionsFor,
  selectedMode,
  OUTREACH_CHANNELS_SHOWN,
  validateHours,
  type OutreachPolicy,
} from "../outreach-policy";

/** La plantilla por defecto del servidor (criterio prudente, D6 incluida). */
const DEFAULT_POLICY: OutreachPolicy = {
  version: 1,
  channels: {
    email: { enabled: true, mode: "any_lead", daily_cap: 1 },
    call: { enabled: true, mode: "any_lead", daily_cap: 1 },
    sms: { enabled: true, mode: "opt_in_only", daily_cap: 1 },
    whatsapp_cloud: { enabled: true, mode: "opt_in_only", daily_cap: 1 },
    whatsapp_web: { enabled: true, mode: "any_lead", daily_cap: 1 },
    instagram_dm: { enabled: true, mode: "if_wrote", daily_cap: 1 },
    facebook_messenger: { enabled: true, mode: "if_wrote", daily_cap: 1 },
    manual: { enabled: true, mode: "any_lead", daily_cap: 1 },
  },
  hours: { weekdays: { start: "07:00", end: "19:00" }, saturday: { start: "08:00", end: "15:00" } },
  cold: { daily_cap: { whatsapp_cloud: 20, sms: 20 } },
};
const FLOOR = DEFAULT_POLICY.hours;

const meta = (key: string) => OUTREACH_CHANNELS_SHOWN.find((m) => m.key === key)!;

describe("canales que se muestran", () => {
  it("no muestra el canal retirado (WhatsApp web) ni el manual", () => {
    const keys = OUTREACH_CHANNELS_SHOWN.map((m) => m.key);
    expect(keys).not.toContain("whatsapp_web");
    expect(keys).not.toContain("manual");
  });
});

describe("isHighRisk", () => {
  it("WhatsApp y SMS a cualquier lead ponen el número en juego; el correo no", () => {
    const open = { enabled: true, mode: "any_lead" as const, daily_cap: 1 };
    expect(isHighRisk(meta("whatsapp_cloud"), { ...open, mode: "cold_controlled" })).toBe(true);
    expect(isHighRisk(meta("whatsapp_cloud"), open)).toBe(true);
    expect(isHighRisk(meta("sms"), open)).toBe(true);
    expect(isHighRisk(meta("email"), open)).toBe(false);
    // Apagado no arriesga nada
    expect(isHighRisk(meta("whatsapp_cloud"), { ...open, enabled: false })).toBe(false);
  });
});

describe("frío controlado", () => {
  it("WhatsApp y SMS ofrecen «Frío controlado» en vez de «A cualquier lead»; el correo no", () => {
    expect(modeOptionsFor("whatsapp_cloud").map((o) => o.value)).toEqual(["opt_in_only", "cold_controlled"]);
    expect(modeOptionsFor("sms").map((o) => o.value)).toEqual(["opt_in_only", "cold_controlled"]);
    expect(modeOptionsFor("email").map((o) => o.value)).toEqual(["opt_in_only", "any_lead"]);
  });

  it("un `any_lead` guardado en WhatsApp se ve como frío controlado (así lo aplica el servidor)", () => {
    expect(selectedMode("whatsapp_cloud", "any_lead")).toBe("cold_controlled");
    expect(isCold("whatsapp_cloud", { enabled: true, mode: "any_lead", daily_cap: 1 })).toBe(true);
    expect(isCold("whatsapp_cloud", { enabled: false, mode: "cold_controlled", daily_cap: 1 })).toBe(false);
    expect(isCold("email", { enabled: true, mode: "any_lead", daily_cap: 1 })).toBe(false);
  });

  it("los frenos dicen el tope y lo propio de cada canal", () => {
    const whatsapp = coldBrakes("whatsapp_cloud", 20);
    expect(whatsapp).toContain("Máximo 20 al día en todo el negocio");
    expect(whatsapp.join(" ")).toMatch(/botón de baja/);
    expect(whatsapp.join(" ")).toMatch(/pausa sola/);
    expect(coldBrakes("sms", 5).join(" ")).toMatch(/Responde NO o BAJA/);
  });
});

describe("validateHours", () => {
  it("el piso pasa; estrecharlo pasa; abrirlo o invertirlo no", () => {
    expect(validateHours(FLOOR, FLOOR)).toEqual({});
    expect(
      validateHours({ ...FLOOR, weekdays: { start: "09:00", end: "17:00" } }, FLOOR),
    ).toEqual({});
    expect(
      validateHours({ ...FLOOR, weekdays: { start: "06:00", end: "19:00" } }, FLOOR).weekdays,
    ).toMatch(/Entre 7:00 y 19:00/);
    expect(
      validateHours({ ...FLOOR, saturday: { start: "14:00", end: "10:00" } }, FLOOR).saturday,
    ).toBeDefined();
  });

  it("sábado cerrado siempre es válido", () => {
    expect(validateHours({ ...FLOOR, saturday: null }, FLOOR)).toEqual({});
  });
});

describe("describeChanges", () => {
  it("sin cambios no hay frase", () => {
    expect(describeChanges(DEFAULT_POLICY, DEFAULT_POLICY)).toBeNull();
  });

  it("activar WhatsApp en frío controlado manda sobre todo lo demás, con sus frenos", () => {
    const after: OutreachPolicy = {
      ...DEFAULT_POLICY,
      channels: {
        ...DEFAULT_POLICY.channels,
        whatsapp_cloud: { enabled: true, mode: "cold_controlled", daily_cap: 1 },
      },
      hours: { ...FLOOR, saturday: null },
      cold: { daily_cap: { whatsapp_cloud: 15, sms: 20 } },
    };
    expect(describeChanges(DEFAULT_POLICY, after)).toEqual({
      title: "Activaste WhatsApp · plantilla en frío controlado",
      detail:
        "solo celulares, un mensaje por negocio hasta que responda, máximo 15 al día; el riesgo queda escrito en cada envío",
    });
  });

  it("abrir la llamada a cualquier lead sigue diciéndose igual", () => {
    const base: OutreachPolicy = {
      ...DEFAULT_POLICY,
      channels: { ...DEFAULT_POLICY.channels, call: { enabled: true, mode: "opt_in_only", daily_cap: 1 } },
    };
    // La llamada no pone un número en juego: no es riesgo alto, solo un cambio
    expect(describeChanges(base, DEFAULT_POLICY)).toEqual({ title: "Un cambio sin guardar" });
  });

  it("cambiar solo el tope del frío cuenta como cambio", () => {
    const after: OutreachPolicy = { ...DEFAULT_POLICY, cold: { daily_cap: { whatsapp_cloud: 10, sms: 20 } } };
    expect(describeChanges(DEFAULT_POLICY, after)).toEqual({ title: "Un cambio sin guardar" });
  });

  it("cuenta los cambios cuando ninguno abre riesgo", () => {
    const after: OutreachPolicy = {
      ...DEFAULT_POLICY,
      channels: { ...DEFAULT_POLICY.channels, email: { enabled: false, mode: "any_lead", daily_cap: 1 } },
      hours: { ...FLOOR, saturday: null },
    };
    expect(describeChanges(DEFAULT_POLICY, after)).toEqual({ title: "2 cambios sin guardar" });
  });
});

it("formatHour quita el cero de relleno", () => {
  expect(formatHour("07:00")).toBe("7:00");
  expect(formatHour("19:30")).toBe("19:30");
});
