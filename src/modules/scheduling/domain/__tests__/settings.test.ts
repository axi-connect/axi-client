import {
  buildSettingsPayload,
  normalizeOffsets,
  offsetLabel,
  splitMinutes,
  unitToMinutes,
} from "../settings";

describe("settings — helpers puros", () => {
  it("unitToMinutes / splitMinutes son inversas en unidades exactas", () => {
    expect(unitToMinutes(2, "days")).toBe(2880);
    expect(unitToMinutes(3, "hours")).toBe(180);
    expect(unitToMinutes(45, "minutes")).toBe(45);

    expect(splitMinutes(2880)).toEqual({ value: 2, unit: "days" });
    expect(splitMinutes(180)).toEqual({ value: 3, unit: "hours" });
    expect(splitMinutes(45)).toEqual({ value: 45, unit: "minutes" });
    // 90 no es divisible por 60 exacto en horas enteras… sí lo es por 30;
    // la regla es hora EXACTA: 90 → minutos.
    expect(splitMinutes(90)).toEqual({ value: 90, unit: "minutes" });
    expect(splitMinutes(0)).toEqual({ value: 0, unit: "minutes" });
  });

  it("offsetLabel pinta la unidad más legible", () => {
    expect(offsetLabel(1440)).toBe("1 día antes");
    expect(offsetLabel(2880)).toBe("2 días antes");
    expect(offsetLabel(60)).toBe("1 h antes");
    expect(offsetLabel(30)).toBe("30 min antes");
  });

  it("normalizeOffsets deduplica y ordena descendente (el más lejano primero)", () => {
    expect(normalizeOffsets([60, 1440, 60, 30])).toEqual([1440, 60, 30]);
    expect(normalizeOffsets([])).toEqual([]);
  });

  it("buildSettingsPayload SIEMPRE manda la sección completa (PUT total)", () => {
    const payload = buildSettingsPayload({
      slot_capacity: 2,
      default_duration_minutes: 30,
      default_buffer_minutes: 10,
      min_notice_minutes: 120,
      reminder_offsets_minutes: [60, 1440],
      reminder_channel: "call",
    });
    expect(Object.keys(payload).sort()).toEqual([
      "default_buffer_minutes",
      "default_duration_minutes",
      "min_notice_minutes",
      "reminder_channel",
      "reminder_offsets_minutes",
      "slot_capacity",
    ]);
    expect(payload.reminder_offsets_minutes).toEqual([1440, 60]);
    // calls F3: omitir el canal lo resetearía a whatsapp — por eso viaja siempre
    expect(payload.reminder_channel).toBe("call");
  });
});
