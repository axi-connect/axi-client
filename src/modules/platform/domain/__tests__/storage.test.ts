import { byOrigin, formatBytes, formatPct, GIB, humanDays, retentionAgeLabel, retentionRuleLabel } from "../storage";

describe("almacenamiento (platform)", () => {
  it("formatea bytes con coma decimal", () => {
    expect(formatBytes(12.6 * GIB)).toBe("12,6 GB");
    expect(formatBytes(840 * 1024 ** 2)).toBe("840 MB");
    expect(formatBytes(150 * GIB)).toBe("150 GB");
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(null)).toBe("0 B");
  });

  it("suma por origen sin lo de plataforma", () => {
    const rows = [
      { category: "inbound_media", origin: "customer", bytes: 600, objects: 1 },
      { category: "catalog_image", origin: "team", bytes: 300, objects: 1 },
      { category: "call_recording", origin: "system", bytes: 100, objects: 1 },
      { category: "quality", origin: "platform", bytes: 5000, objects: 1 },
    ] as Parameters<typeof byOrigin>[0];
    expect(byOrigin(rows)).toEqual([
      { origin: "customer", bytes: 600, pct: 60 },
      { origin: "team", bytes: 300, pct: 30 },
      { origin: "system", bytes: 100, pct: 10 },
    ]);
  });

  it("dice el ritmo en palabras", () => {
    expect(humanDays(3)).toBe("menos de una semana");
    expect(humanDays(14)).toBe("unas 2 semanas");
    expect(humanDays(90)).toBe("unos 3 meses");
    expect(humanDays(800)).toBe("unos 2 años");
  });

  it("porcentaje y reglas de retención legibles", () => {
    expect(formatPct(84.44)).toBe("84,4 %");
    expect(formatPct(null)).toBe("—");
    expect(
      retentionRuleLabel({ kind: "conversation_media", filter: { origin: "customer", mime_classes: ["video"] }, max_age_days: 180 }),
    ).toBe("Videos que envían los clientes");
    expect(retentionAgeLabel(365)).toBe("más de 1 año");
    expect(retentionAgeLabel(90)).toBe("más de 90 días");
  });
});
