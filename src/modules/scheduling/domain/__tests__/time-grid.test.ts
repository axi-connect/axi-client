import { buildCreatePayload } from "../appointment-payload";
import {
  closedIntervals,
  createAtHref,
  fmtClock,
  fmtClockRange,
  isWithinOpenHours,
  minutesToHhmm,
  openHoursLabel,
  readCreatePrefill,
  slotAtOffset,
  timezoneOffsetLabel,
  weekdayShort,
} from "../time-grid";

const BOGOTA = "America/Bogota";
// weekday 0 = domingo … 6 = sábado. Lunes a viernes 8–18, sábado 9–13.
const SCHEDULES = [1, 2, 3, 4, 5]
  .map((weekday) => ({ weekday, opens_at: "08:00", closes_at: "18:00" }))
  .concat([{ weekday: 6, opens_at: "09:00", closes_at: "13:00" }]);

function params(entries: Record<string, string>) {
  return { get: (key: string) => entries[key] ?? null };
}

describe("slotAtOffset (tocar un hueco)", () => {
  const MINUTE_PX = 64 / 60;

  it("redondea hacia abajo a la media hora que contiene el puntero", () => {
    expect(slotAtOffset(10 * 64 + 5, MINUTE_PX)).toBe(600);
    expect(slotAtOffset(10 * 64 + 31, MINUTE_PX)).toBe(600);
    expect(slotAtOffset(10 * 64 + 33, MINUTE_PX)).toBe(630);
  });

  it("no se sale del día", () => {
    expect(slotAtOffset(-20, MINUTE_PX)).toBe(0);
    expect(slotAtOffset(24 * 64 + 50, MINUTE_PX)).toBe(1410);
  });
});

describe("isWithinOpenHours", () => {
  it("dentro del horario: la media hora cabe entera en la franja", () => {
    // 2026-10-01 es jueves.
    expect(isWithinOpenHours(SCHEDULES, "2026-10-01", 10 * 60)).toBe(true);
    expect(isWithinOpenHours(SCHEDULES, "2026-10-01", 17 * 60 + 30)).toBe(true);
  });

  it("fuera: antes de abrir, al cierre, y el domingo cerrado", () => {
    expect(isWithinOpenHours(SCHEDULES, "2026-10-01", 7 * 60 + 30)).toBe(false);
    expect(isWithinOpenHours(SCHEDULES, "2026-10-01", 18 * 60)).toBe(false);
    expect(isWithinOpenHours(SCHEDULES, "2026-10-01", 17 * 60 + 45, 30)).toBe(false);
    expect(isWithinOpenHours(SCHEDULES, "2026-10-04", 10 * 60)).toBe(false);
  });

  it("sin horario configurado no avisa (lo cubre «Configura tu horario»)", () => {
    expect(isWithinOpenHours([], "2026-10-04", 3 * 60)).toBe(true);
  });

  it("describe las franjas del día", () => {
    expect(openHoursLabel(SCHEDULES, "2026-10-01")).toBe("8:00 – 18:00");
    expect(openHoursLabel(SCHEDULES, "2026-10-03")).toBe("9:00 – 13:00");
    expect(openHoursLabel(SCHEDULES, "2026-10-04")).toBeNull();
  });
});

describe("createAtHref ↔ readCreatePrefill", () => {
  it("el hueco viaja en la URL y vuelve igual", () => {
    const href = createAtHref("2026-10-01", 9 * 60 + 30);
    expect(href).toBe("/scheduling/calendar/create?date=2026-10-01&time=09:30");
    const query = new URLSearchParams(href.split("?")[1]);
    expect(readCreatePrefill(query)).toEqual({ date: "2026-10-01", time: "09:30" });
  });

  it("ignora valores mal formados o incompletos", () => {
    expect(readCreatePrefill(params({ date: "2026-10-01" }))).toBeNull();
    expect(readCreatePrefill(params({ date: "1/10/2026", time: "09:30" }))).toBeNull();
    expect(readCreatePrefill(params({ date: "2026-10-01", time: "25:00" }))).toBeNull();
  });

  it("la hora tocada es pared del negocio: el instante depende de su zona", () => {
    const prefill = readCreatePrefill(params({ date: "2026-10-01", time: "10:00" }));
    expect(prefill).not.toBeNull();
    const input = { date: prefill!.date, time: prefill!.time, durationMinutes: 30 };
    // Bogotá (UTC−5): las 10:00 del negocio son las 15:00 UTC…
    expect(buildCreatePayload("c1", input, BOGOTA).starts_at).toBe("2026-10-01T15:00:00.000Z");
    // …y en un negocio en UTC, las mismas 10:00 son otro instante.
    expect(buildCreatePayload("c1", input, "UTC").starts_at).toBe("2026-10-01T10:00:00.000Z");
  });
});

describe("closedIntervals", () => {
  it("es el complemento de las franjas abiertas", () => {
    expect(closedIntervals([{ startMin: 480, endMin: 1080 }])).toEqual([
      { startMin: 0, endMin: 480 },
      { startMin: 1080, endMin: 1440 },
    ]);
    expect(closedIntervals([])).toEqual([{ startMin: 0, endMin: 1440 }]);
  });
});

describe("formatos del calendario", () => {
  it("reloj compacto de 24 h en la zona del negocio", () => {
    expect(fmtClock("2026-10-01T14:00:00.000Z", BOGOTA)).toBe("9:00");
    expect(fmtClockRange("2026-10-01T20:30:00.000Z", "2026-10-01T21:15:00.000Z", BOGOTA)).toBe(
      "15:30 – 16:15",
    );
  });

  it("minutos a HH:mm del formulario", () => {
    expect(minutesToHhmm(9 * 60 + 5)).toBe("09:05");
  });

  it("la zona del negocio en la esquina de la rejilla", () => {
    expect(timezoneOffsetLabel(BOGOTA)).toBe("GMT−5");
    expect(timezoneOffsetLabel("no/zona")).toBe("GMT");
  });

  it("día corto sin punto", () => {
    expect(weekdayShort("2026-09-30")).toBe("mié");
  });
});
