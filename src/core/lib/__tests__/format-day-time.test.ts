import { formatDayTime, formatShortDateTime } from "../format";

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
