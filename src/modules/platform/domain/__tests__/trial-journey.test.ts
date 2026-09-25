import { countdownParts, elapsedLabel, journeyDayOf, nextMilestone, trialJourney } from "../trial-journey";

const BOGOTA = "America/Bogota";

// Prueba real del QA: entrega el vie 25 sep a la 1:00 a. m. (hora de Bogotá).
const input = {
  startsAt: "2026-09-25T06:00:00Z",
  endsAt: "2026-10-03T04:59:00Z",
  timeZone: BOGOTA,
  callDay2At: "2026-09-28T15:00:00Z", // lun 28 · 10:00 a. m.
  callDay5At: "2026-09-30T20:30:00Z", // mié 30 · 3:30 p. m.
};

describe("trialJourney", () => {
  it("marca hoy en la zona del tenant, no en UTC", () => {
    // sáb 26 sep a las 10:30 p. m. en Bogotá = dom 27 03:30 UTC: sigue siendo el día 1.
    const journey = trialJourney(input, new Date("2026-09-27T03:30:00Z"));
    expect(journey.todayIndex).toBe(1);
    expect(journey.days.map((day) => day.state)).toEqual([
      "done", "today", "upcoming", "upcoming", "upcoming", "upcoming", "upcoming", "upcoming",
    ]);
  });

  it("pone cada cita en el día de su fecha, en dos líneas: tipo y hora", () => {
    const journey = trialJourney(input, new Date("2026-09-26T15:00:00Z"));
    const labels = journey.days.map((day) => day.milestones.map((m) => [m.title, m.detail]));
    // La llamada «del día 2» cae el lunes 28 = día 3 del recorrido: se pinta donde cae.
    expect(labels).toEqual([
      [["Entrega", null]],
      [["1.er resumen", null]],
      [],
      [["Llamada", "10:00 a. m."]],
      [],
      [["Reunión", "3:30 p. m."]],
      [],
      [["Decide", null]],
    ]);
  });

  it("días seguidos y dos hitos el mismo día: ninguno se pierde (A1)", () => {
    // Entrega un lunes: llamada el martes (día 1) y reunión el miércoles (día 2)… y otra cita el día 2.
    const monday = {
      startsAt: "2026-09-28T13:00:00Z",
      endsAt: "2026-10-06T04:59:00Z",
      timeZone: BOGOTA,
      callDay2At: "2026-09-29T15:00:00Z",
      callDay5At: "2026-09-29T20:00:00Z",
    };
    const journey = trialJourney(monday, new Date("2026-09-28T15:00:00Z"));
    expect(journey.days[1]?.milestones.map((m) => m.kind)).toEqual(["call", "meeting"]);
    // El día 1 ya tiene cita: no se nombra el resumen para no montar tres etiquetas.
    expect(journey.days[1]?.milestones.some((m) => m.kind === "digest")).toBe(false);
  });

  it("antes de empezar no hay hoy; después del día 7, terminó", () => {
    expect(trialJourney(input, new Date("2026-09-24T12:00:00Z")).todayIndex).toBeNull();
    const after = trialJourney(input, new Date("2026-10-04T15:00:00Z"));
    expect(after.todayIndex).toBeNull();
    expect(after.finished).toBe(true);
    expect(after.days.every((day) => day.state === "done")).toBe(true);
  });

  it("una cita fuera de los 8 días no se pinta ni pisa otro hito", () => {
    const journey = trialJourney({ ...input, callDay5At: "2026-10-10T15:00:00Z" }, new Date("2026-09-26T15:00:00Z"));
    expect(journey.days.some((day) => day.milestones.some((m) => m.kind === "meeting"))).toBe(false);
    expect(journey.days[7]?.milestones[0]?.kind).toBe("decide");
  });
});

describe("journeyDayOf", () => {
  it("cuenta días de calendario en la zona", () => {
    expect(journeyDayOf(input.startsAt, "2026-09-25T23:00:00Z", BOGOTA)).toBe(0);
    expect(journeyDayOf(input.startsAt, "2026-09-26T05:30:00Z", BOGOTA)).toBe(1);
  });
});

describe("nextMilestone", () => {
  it("devuelve la primera cita que no pasó", () => {
    expect(nextMilestone(input, new Date("2026-09-26T15:00:00Z"))?.kind).toBe("call");
    expect(nextMilestone(input, new Date("2026-09-29T15:00:00Z"))?.kind).toBe("meeting");
    expect(nextMilestone(input, new Date("2026-10-01T15:00:00Z"))).toMatchObject({ kind: "decide", minutes: null });
    expect(nextMilestone(input, new Date("2026-10-05T15:00:00Z"))).toBeNull();
  });
});

describe("countdownParts", () => {
  const now = new Date("2026-09-26T00:00:00Z");
  it("usa dos unidades como mucho", () => {
    expect(countdownParts("2026-09-28T09:00:00Z", now)).toEqual({ major: "2 d", minor: "9 h" });
    expect(countdownParts("2026-09-26T03:20:00Z", now)).toEqual({ major: "3 h", minor: "20 min" });
    expect(countdownParts("2026-09-26T00:12:00Z", now)).toEqual({ major: "12 min", minor: null });
    expect(countdownParts("2026-09-28T00:00:00Z", now)).toEqual({ major: "2 d", minor: null });
    expect(countdownParts("2026-09-26T00:00:20Z", now)).toEqual({ major: "menos de 1 min", minor: null });
  });
});

describe("elapsedLabel", () => {
  it("minutos, horas o días desde el correo hasta la contraseña", () => {
    expect(elapsedLabel("2026-09-25T06:00:00Z", "2026-09-25T06:12:00Z")).toEqual({ value: "12", unit: "min" });
    expect(elapsedLabel("2026-09-25T06:00:00Z", "2026-09-25T09:10:00Z")).toEqual({ value: "3", unit: "h" });
    expect(elapsedLabel("2026-09-25T06:00:00Z", "2026-09-28T06:00:00Z")).toEqual({ value: "3", unit: "d" });
    expect(elapsedLabel("2026-09-25T06:00:00Z", "2026-09-25T06:00:10Z")).toEqual({ value: "1", unit: "min" });
  });
  it("sin alguno de los dos instantes, o al revés, no hay cifra", () => {
    expect(elapsedLabel(null, "2026-09-25T06:12:00Z")).toBeNull();
    expect(elapsedLabel("2026-09-25T06:12:00Z", "2026-09-25T06:00:00Z")).toBeNull();
  });
});
