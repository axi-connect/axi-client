import { relativeTime } from "../relative-time";

const NOW = new Date("2026-07-11T12:00:00Z");

describe("relativeTime", () => {
  it("devuelve segundos para deltas menores a un minuto", () => {
    expect(relativeTime("2026-07-11T11:59:30Z", NOW)).toMatch(/30/);
  });

  it("devuelve minutos para deltas menores a una hora", () => {
    expect(relativeTime("2026-07-11T11:45:00Z", NOW)).toMatch(/15\s?min/);
  });

  it("devuelve horas para deltas menores a un día", () => {
    expect(relativeTime("2026-07-11T09:00:00Z", NOW)).toMatch(/3\s?h/);
  });

  it("usa formas naturales para el día anterior", () => {
    expect(relativeTime("2026-07-10T11:00:00Z", NOW)).toMatch(/ayer/i);
  });

  it("cae a fecha absoluta corta pasado ~un mes (sin año si es el mismo)", () => {
    const result = relativeTime("2026-05-01T12:00:00Z", NOW);
    expect(result).toMatch(/may/i);
    expect(result).not.toMatch(/2026/);
  });

  it("incluye el año cuando difiere del actual", () => {
    expect(relativeTime("2025-05-01T12:00:00Z", NOW)).toMatch(/2025/);
  });

  it("devuelve cadena vacía para fechas inválidas", () => {
    expect(relativeTime("no-es-fecha", NOW)).toBe("");
  });
});
