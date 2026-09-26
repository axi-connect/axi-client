import { formatDayTime, formatShortDate, formatShortDateTime } from "../format";

/** F2: la hora absoluta de la bandeja, en la zona del negocio. */
describe("formatDayTime", () => {
  it("pinta «día · hora» en la zona pedida (Bogotá, UTC-5)", () => {
    expect(formatDayTime("2026-09-18T14:00:00.000Z", "America/Bogota")).toBe("vie 18 sept · 9:00 a. m.");
  });

  it("cambia de día al cambiar de zona", () => {
    // 04:00Z del 15 es la noche del 14 en Bogotá
    expect(formatDayTime("2026-09-15T04:00:00.000Z", "America/Bogota")).toContain("lun 14");
  });

  it("una fecha inválida no rompe la fila", () => {
    expect(formatDayTime("no-es-fecha")).toBe("");
    expect(formatShortDateTime("no-es-fecha")).toBe("");
  });
});

describe("formatShortDate", () => {
  it("una fecha SIN hora se pinta tal cual, no el día anterior", () => {
    // `new Date("2026-09-20")` es medianoche UTC: en Bogotá, las 19:00 del 19.
    // La salida de la expedición y la vigencia de la TRM son días del
    // calendario, no instantes, y se leían corridas un día.
    expect(formatShortDate("2026-09-20")).toBe("20 de sept de 2026");
    expect(formatShortDate("2026-01-01")).toBe("01 de ene de 2026");
  });

  it("un instante con hora sigue en la zona de quien mira", () => {
    expect(formatShortDate("2026-09-20T15:00:00.000Z")).toBe("20 de sept de 2026");
    expect(formatShortDate("no-es-fecha")).toBe("");
  });
});
