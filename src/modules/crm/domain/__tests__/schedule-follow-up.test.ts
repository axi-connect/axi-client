import type { ContactReachabilityDTO } from "../schedule-follow-up";
import {
  businessDateTimeToIso,
  dateShortcuts,
  defaultOpeningParams,
  isInPast,
  isoToBusinessDateTime,
  promiseSentence,
  quietHoursShift,
  renderTemplatePreview,
  windowNotice,
} from "../schedule-follow-up";

const TZ = "America/Bogota";
// lunes 14 sep 2026, 2:00 p. m. en Bogotá (19:00Z)
const NOW = new Date("2026-09-14T19:00:00.000Z");

function reach(over: Partial<ContactReachabilityDTO> = {}): ContactReachabilityDTO {
  return {
    can_message_now: true,
    reason: null,
    channel_id: "ch-cloud",
    channel_kind: "whatsapp_cloud",
    last_inbound_at: "2026-09-14T16:00:00.000Z", // hace 3 h
    window_hours: 24,
    supports_templates: true,
    ...over,
  };
}

describe("schedule-follow-up — cuándo", () => {
  it("los atajos van en la zona del negocio a las 9:00", () => {
    const shortcuts = dateShortcuts(NOW, TZ);
    expect(shortcuts.map((s) => s.key)).toEqual(["tomorrow", "in_3_days", "next_monday"]);
    expect(shortcuts[0]).toMatchObject({ date: "2026-09-15", time: "09:00", label: "Mañana 9:00" });
    expect(shortcuts[1]).toMatchObject({ date: "2026-09-17", label: "En 3 días · jue 9:00" });
    // Un lunes, «Lunes 9:00» es el lunes SIGUIENTE, no hoy
    expect(shortcuts[2]).toMatchObject({ date: "2026-09-21" });
  });

  it("fecha+hora de pared ↔ instante UTC, ida y vuelta en Bogotá (UTC-5)", () => {
    const iso = businessDateTimeToIso("2026-09-18", "09:00", TZ);
    expect(iso).toBe("2026-09-18T14:00:00.000Z");
    expect(isoToBusinessDateTime(iso, TZ)).toEqual({ date: "2026-09-18", time: "09:00" });
  });

  it("detecta una hora ya pasada y tolera entradas incompletas", () => {
    expect(isInPast("2026-09-14", "08:00", TZ, NOW)).toBe(true);
    expect(isInPast("2026-09-14", "15:00", TZ, NOW)).toBe(false);
    expect(isInPast("", "15:00", TZ, NOW)).toBe(false);
  });

  it("horario silencioso 20→8: las 21:00 salen a las 8:00 del día siguiente; las 3:00 a las 8:00 del mismo día", () => {
    expect(quietHoursShift("2026-09-18", "21:00", 20, 8)).toEqual({
      quiet: true,
      resumes_at: { date: "2026-09-19", time: "08:00" },
      window: "8:00 p. m.–8:00 a. m.",
    });
    expect(quietHoursShift("2026-09-18", "03:00", 20, 8)).toMatchObject({
      quiet: true,
      resumes_at: { date: "2026-09-18", time: "08:00" },
    });
    expect(quietHoursShift("2026-09-18", "10:00", 20, 8)).toEqual({ quiet: false });
    // start === end es «sin silencio», igual que el motor
    expect(quietHoursShift("2026-09-18", "21:00", 0, 0)).toEqual({ quiet: false });
  });
});

describe("schedule-follow-up — estado del contacto", () => {
  const soon = businessDateTimeToIso("2026-09-14", "16:00", TZ); // en 2 h: dentro de ventana
  const later = businessDateTimeToIso("2026-09-18", "09:00", TZ); // en 4 días: ventana cerrada

  it("dentro de ventana a la hora elegida: puede escribir, con la hora de cierre", () => {
    const notice = windowNotice(reach(), "Ana", TZ, true, soon, NOW);
    expect(notice.tone).toBe("ok");
    expect(notice.title).toContain("Ana escribió");
    expect(notice.body).toContain("hasta las 11:00 a. m.");
    expect(notice.needs_template).toBe(false);
  });

  it("escribió hace poco pero la tarea es para después de que cierre la ventana: hace falta plantilla", () => {
    const notice = windowNotice(reach(), "Ana", TZ, true, later, NOW);
    expect(notice.tone).toBe("info");
    expect(notice.title).toContain("ya habrá cerrado");
    expect(notice.needs_template).toBe(true);
    expect(notice.waits_for_customer).toBe(false);
  });

  it("frío con plantilla aprobada → pide plantilla; frío sin plantilla → espera al cliente", () => {
    const cold = reach({
      can_message_now: false,
      reason: "outside_service_window",
      last_inbound_at: "2026-09-10T10:00:00.000Z",
    });
    expect(windowNotice(cold, "Ana", TZ, true, later, NOW)).toMatchObject({
      tone: "info",
      needs_template: true,
      waits_for_customer: false,
    });
    expect(windowNotice(cold, "Ana", TZ, false, later, NOW)).toMatchObject({
      tone: "warn",
      needs_template: false,
      waits_for_customer: true,
    });
  });

  it("canal sin plantillas (Instagram) fuera de ventana: espera al cliente aunque haya plantillas", () => {
    const ig = reach({
      can_message_now: false,
      reason: "outside_service_window",
      channel_kind: "instagram_dm",
      supports_templates: false,
    });
    expect(windowNotice(ig, "Ana", TZ, true, later, NOW)).toMatchObject({
      tone: "warn",
      waits_for_customer: true,
    });
  });

  it("sin canal: aviso en ámbar y la tarea se programa igual", () => {
    const none = reach({ can_message_now: false, reason: "no_channel", channel_id: null, channel_kind: null });
    const notice = windowNotice(none, "", TZ, false, later, NOW);
    expect(notice.tone).toBe("warn");
    expect(notice.title).toContain("El contacto no tiene ningún canal");
  });

  it("sin datos aún: silencioso", () => {
    expect(windowNotice(null, "Ana", TZ, false, null, NOW).tone).toBe("muted");
  });
});

describe("schedule-follow-up — plantilla y promesa", () => {
  it("rellena la vista previa con la misma regla que el backend y marca las variables", () => {
    const segments = renderTemplatePreview(
      "Hola {{1}}, te escribo por {{2}}. ¿Seguimos?",
      ["first_name", "topic"],
      { first_name: null, full_name: "Ana María Gómez", company_name: "Axi", topic: "la cotización" },
    );
    expect(segments).toEqual([
      { text: "Hola ", variable: false },
      { text: "Ana", variable: true },
      { text: ", te escribo por ", variable: false },
      { text: "la cotización", variable: true },
      { text: ". ¿Seguimos?", variable: false },
    ]);
  });

  it("un contacto sin nombre jamás deja la variable vacía; el tema vacío se ve como hueco", () => {
    const segments = renderTemplatePreview("Hola {{1}}, sobre {{2}}", ["first_name", "topic"], {
      first_name: null,
      full_name: null,
      company_name: "",
      topic: "",
    });
    expect(segments[1]).toEqual({ text: "Hola", variable: true });
    expect(segments[3]).toEqual({ text: "…", variable: true });
  });

  it("{{1}} nombre, {{2}} tema, el resto empresa", () => {
    expect(defaultOpeningParams(3)).toEqual(["first_name", "topic", "company_name"]);
    expect(defaultOpeningParams(0)).toEqual([]);
  });

  it("la promesa nombra agente, contacto, día y hora en la zona del negocio", () => {
    const sentence = promiseSentence({
      agent_name: "Aria",
      contact_first_name: "Ana",
      iso: businessDateTimeToIso("2026-09-18", "09:00", TZ),
      tz: TZ,
      medium: "message",
      opens_with_template: true,
      waits_for_customer: false,
      quiet_shift: { quiet: false },
    });
    // 2026-09-18 es viernes; el mes abreviado en es-CO es «sept».
    expect(sentence.headline).toBe("Aria le escribirá a Ana el vie 18 sept a las 9:00 a. m.");
    expect(sentence.detail).toContain("Abre con la plantilla");
  });

  it("si espera al cliente, la promesa lo dice en vez de prometer una hora", () => {
    const sentence = promiseSentence({
      agent_name: "Aria",
      contact_first_name: "Ana",
      iso: businessDateTimeToIso("2026-09-18", "09:00", TZ),
      tz: TZ,
      medium: "message",
      opens_with_template: false,
      waits_for_customer: true,
      quiet_shift: { quiet: false },
    });
    expect(sentence.headline).toBe("Aria le escribirá a Ana cuando vuelva a escribir.");
  });
});
