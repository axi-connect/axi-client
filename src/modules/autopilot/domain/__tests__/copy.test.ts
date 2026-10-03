import { defaultRoutineInput, RUN_STATUSES, type RunEvent } from "../autopilot";
import {
  ahoraMismo,
  batchCopy,
  destinationRows,
  eventLine,
  exitTitle,
  failureLine,
  nextLine,
  nowLine,
  previewHeadline,
  previewStops,
  revealCredits,
  routineStatusLine,
  stepSummaries,
} from "../copy";
import { itemFixture, listItemFixture, routineFixture, runFixture, summaryFixture } from "./recorrido.fixtures";

const routine = routineFixture();
const autonomous = routineFixture({ mode: "autonomous" });

describe("copy — la frase de ahora", () => {
  it("cada parada en vuelo dice qué hace", () => {
    const line = (step: string | null, counters: Record<string, number> = {}) => nowLine(runFixture({ step, counters }), routine);
    expect(line(null)).toEqual({
      title: "Buscando restaurantes en Medellín",
      detail: "Trae hasta 25 cuentas de Google Maps. Buscar no gasta créditos.",
    });
    expect(line("await_search", { found: 25 }).title).toBe("Completando los datos de 25 cuentas");
    expect(line("await_search", { found: 1 }).title).toBe("Completando los datos de 1 cuenta");
    expect(line("await_enrich", { found: 25 })).toEqual({
      title: "Calificando quién encaja",
      detail: "Pasan las de puntaje 60 o más con decisor identificado. Revelar el correo cuesta 1 crédito, solo si lo encuentra.",
    });
    expect(line("qualify", { found: 25, qualified: 6 }).title).toBe("Calificando: 6 de 25 pasan, por ahora");
    expect(line("qualify", { found: 25, qualified: 1 }).title).toBe("Calificando: 1 de 25 pasa, por ahora");
    expect(line("await_reveal", { qualified: 9 }).title).toBe("Pasando 9 cuentas al CRM");
    expect(line("promote", { qualified: 9 }).title).toBe("Revisando tu política de contacto");
    expect(nowLine(runFixture({ step: "gate", counters: { promoted: 9, blocked: 2 } }), autonomous)).toEqual({
      title: "Escribiéndoles a 7 cuentas",
      detail: "Por correo y llamada del agente, dentro de tu horario.",
    });
  });

  it("revelar el celular cambia lo que cuesta", () => {
    const phone = routineFixture({ qualify: { ...routine.qualify, reveal_phone: true, require_decision_maker: false } });
    expect(nowLine(runFixture({ step: "await_enrich" }), phone).detail).toBe(
      "Pasan las de puntaje 60 o más. Revelar el correo y el celular cuesta 9 créditos, solo si lo encuentra.",
    );
    expect(revealCredits({ reveal_email: false, reveal_phone: false })).toBe(0);
  });

  it("los estados que no son «en vuelo» tienen su frase", () => {
    expect(nowLine(runFixture({ status: "queued" }), routine)).toEqual({
      title: "Sale en un momento",
      detail: "Cuando arranque, verás aquí cada parada con sus cifras.",
    });
    expect(nowLine(runFixture({ status: "paused", step: "await_search" }), routine)).toEqual({
      title: "Pausaste el piloto",
      detail: "Quedó en «Completar datos». Sigue donde iba cuando la reanudes.",
    });
    expect(nowLine(runFixture({ status: "budget_exhausted", step: "qualify", credits_spent: 40, counters: { qualified: 9 } }), routine)).toEqual({
      title: "Se acabó el tope de esta salida",
      detail:
        "Gastó los 40 créditos al revelar quién decide. Terminó con 9 cuentas calificadas; las que no alcanzó a revelar quedan para la siguiente.",
    });
    // No llegó a su tope por salida: lo que se acabó fue el del mes, y el título lo dice.
    const month = nowLine(runFixture({ status: "budget_exhausted", step: "qualify", credits_spent: 3, counters: { qualified: 1 } }), routine);
    expect(month.title).toBe("Se acabó el tope del mes");
    expect(month.detail).toMatch(/^Se llegó a los 600 créditos del mes\. Terminó con 1 cuenta calificada;/);
    expect(nowLine(runFixture({ status: "budget_exhausted", error: "provider_out_of_credits" }), routine).title).toBe(
      "Se acabó tu saldo en el proveedor",
    );
  });

  it("espera tu aprobación: cuántas están listas y dónde la espera Axi", () => {
    expect(nowLine(runFixture({ status: "awaiting_approval", step: "approve", counters: { awaiting: 7 } }), routine)).toEqual({
      title: "7 cuentas listas para escribirles",
      detail: "Axi te espera en «Tu aprobación». En cuanto apruebes, sigue a «Escribirles».",
    });
    expect(nowLine(runFixture({ status: "awaiting_approval", step: "approve", counters: { awaiting: 1 } }), routine).title).toBe(
      "1 cuenta lista para escribirles",
    );
  });

  it("falló: dice qué pasó sin la clave del error", () => {
    expect(nowLine(runFixture({ status: "failed", step: "search", error: "search_timeout" }), routine)).toEqual({
      title: "La salida se detuvo",
      detail: "No se pudo leer la fuente: Google Maps no respondió. No se gastó nada más; puedes salir de nuevo.",
    });
    const other = nowLine(runFixture({ status: "failed", step: "promote", error: "TypeError: boom" }), routine).detail;
    expect(other).toBe("Algo falló en «Tu política». No se gastó nada más; puedes salir de nuevo.");
    expect(other).not.toMatch(/TypeError/);
  });

  it("si el piloto no cargó, el error también va en palabras", () => {
    const failed = (error: string) => runFixture({ status: "failed", step: "promote", error });
    expect(failureLine(failed("search_failed"), null)).toBe("No se pudo leer la fuente: no respondió. No se gastó nada más; puedes salir de nuevo.");
    expect(failureLine(failed("promote: ProspectingLeadNotIdentifiableError: El lead…"), null)).toBe(
      "Algo falló en esta salida. No se gastó nada más; puedes salir de nuevo.",
    );
    expect(failureLine(failed("routine_deleted"), null)).toBe("El piloto se eliminó mientras la salida corría.");
  });

  it("terminada, con y sin cuentas, en singular y plural", () => {
    const done = (counters: Record<string, number>) => runFixture({ status: "done", step: "contact", counters });
    expect(nowLine(done({ found: 25, qualified: 9, contacted: 6 }), routine, { sequenceName: "Primer contacto · 4 pasos", agentName: "Sofía" })).toEqual({
      title: "Terminada: 6 cuentas en seguimiento",
      detail: "Siguen la secuencia «Primer contacto · 4 pasos». Si alguien responde, Sofía conversa y te avisa.",
    });
    expect(nowLine(done({ contacted: 1 }), routine)).toEqual({
      title: "Terminada: 1 cuenta en seguimiento",
      detail: "Siguen la secuencia de seguimiento. Si alguien responde, el agente conversa y te avisa.",
    });
    expect(nowLine(done({ found: 0 }), routine).detail).toBe("La fuente no trajo cuentas con este filtro.");
    expect(nowLine(done({ found: 25, qualified: 0 }), routine).detail).toBe(
      "Ninguna cuenta pasó tu filtro: puntaje 60 o más con decisor identificado.",
    );
    expect(nowLine(done({}), routine).title).toBe("Terminada sin cuentas nuevas");
  });

  it("terminada sin inscribir a nadie dice la verdad, con el motivo dominante", () => {
    const counters = { found: 10, qualified: 10, promoted: 10, blocked: 2, awaiting: 8, batch_skipped: 1, contacted: 0, enroll_skipped: 7 };
    const items = Array.from({ length: 7 }, () => itemFixture("discarded", "enroll_no_channel", "approved"));
    expect(nowLine(runFixture({ status: "done", step: "contact", counters, items }), routine)).toEqual({
      title: "Terminada: no se pudo inscribir a nadie",
      detail: "7 no tienen canal para escribirles. Revisa que la secuencia esté activa y tenga un canal para estas cuentas.",
    });
    const mixed = [
      itemFixture("discarded", "enroll_not_enrolled", "approved"),
      itemFixture("discarded", "enroll_not_enrolled", "approved"),
      itemFixture("discarded", "enroll_opted_out", "approved"),
    ];
    expect(nowLine(runFixture({ status: "done", step: "contact", counters: { ...counters, enroll_skipped: 3 }, items: mixed }), routine).detail).toMatch(
      /^La secuencia no inscribió a 2 \(¿está activa\?\) y 1 no se pudo inscribir por otros motivos\./,
    );
  });

  it("una salida vieja sin el motivo lo dice por el total", () => {
    const counters = { found: 10, qualified: 10, awaiting: 8, batch_skipped: 1, contacted: 0, enroll_skipped: 7 };
    const items = Array.from({ length: 7 }, () => itemFixture("following", null, "approved"));
    expect(nowLine(runFixture({ status: "done", step: "contact", counters, items }), routine).detail).toMatch(/^7 no se pudieron inscribir\./);
  });

  it("inscritas y no inscritas mezcladas: en seguimiento, y además las que no entraron", () => {
    const counters = { found: 5, qualified: 5, contacted: 3, enroll_skipped: 1 };
    const items = [itemFixture("following", null, "approved"), itemFixture("discarded", "enroll_no_channel", "approved")];
    expect(nowLine(runFixture({ status: "done", step: "contact", counters, items }), routine).detail).toBe(
      "Siguen la secuencia de seguimiento. Si alguien responde, el agente conversa y te avisa. Además, 1 no tiene canal para escribirle.",
    );
  });

  it("los siete estados tienen título y detalle", () => {
    for (const status of RUN_STATUSES) {
      const line = nowLine(runFixture({ status, step: "await_search", counters: { found: 2 } }), routine);
      expect(line.title.length).toBeGreaterThan(0);
      expect(line.detail.length).toBeGreaterThan(0);
    }
  });

  it("«Después» nombra la parada siguiente, luego «Lo que viene», y calla al terminar", () => {
    expect(nextLine(runFixture({ status: "queued" }), routine)).toBe("Después: Buscar");
    expect(nextLine(runFixture({ step: "await_search" }), routine)).toBe("Después: Calificar");
    expect(nextLine(runFixture({ status: "awaiting_approval", step: "approve" }), routine)).toBe("Después: Escribirles");
    expect(nextLine(runFixture({ step: "gate" }), autonomous)).toBe("Después: Lo que viene");
    for (const status of ["done", "failed", "budget_exhausted"] as const) {
      expect(nextLine(runFixture({ status, step: "await_search" }), routine)).toBeNull();
    }
  });
});

describe("copy — los desvíos", () => {
  it("cada parada con su frase, en singular y plural", () => {
    expect(exitTitle({ at: "qualify", total: 16 })).toBe("16 no pasaron tu filtro");
    expect(exitTitle({ at: "qualify", total: 1 })).toBe("1 no pasó tu filtro");
    expect(exitTitle({ at: "promote", total: 2 })).toBe("2 no pasaron al CRM");
    expect(exitTitle({ at: "gate", total: 2 })).toBe("2 frenadas por tu política");
    expect(exitTitle({ at: "gate", total: 1 })).toBe("1 frenada por tu política");
    expect(exitTitle({ at: "approve", total: 1 })).toBe("1 la omitiste");
    expect(exitTitle({ at: "approve", total: 3 })).toBe("3 las omitiste");
    expect(exitTitle({ at: "contact", total: 7 })).toBe("7 no se pudieron inscribir");
    expect(exitTitle({ at: "contact", total: 1 })).toBe("1 no se pudo inscribir");
    expect(exitTitle({ at: "search", total: 1 })).toBe("1 se quedó en el camino");
    expect(exitTitle({ at: "search", total: 2 })).toBe("2 se quedaron en el camino");
  });
});

describe("copy — «Ahora mismo»", () => {
  const now = new Date("2026-10-01T15:00:00Z"); // 10:00 en Bogotá

  it("nada en vuelo ni esperando: no se pinta", () => {
    const doneRun = summaryFixture({ status: "done" });
    const idle = listItemFixture({ next_run_at: "2026-10-01T19:00:00Z", last_run: doneRun });
    expect(ahoraMismo([idle], now)).toBeNull();
    expect(ahoraMismo([], now)).toBeNull();
  });

  it("un piloto en vuelo, un lote que espera y la próxima salida del piloto que se nombra", () => {
    const flyingRun = summaryFixture({ id: "run-fly", step: "await_search", counters: { found: 25 } });
    const waitingRun = summaryFixture({ id: "run-lot", status: "awaiting_approval", step: "approve", counters: { awaiting: 7 } });
    const result = ahoraMismo(
      [
        listItemFixture({ id: "r-1", name: "Clínicas de Bogotá", last_run: flyingRun, next_run_at: "2026-10-01T19:00:00Z" }),
        listItemFixture({ id: "r-2", last_run: waitingRun, next_run_at: "2026-10-02T13:00:00Z" }),
      ],
      now,
    );
    expect(result).toEqual({
      headline: "7 cuentas esperan tu aprobación",
      // La de las 14:00 es de «Clínicas»: la frase nombra a Restaurantes, así que dice la suya.
      context: "Restaurantes de Medellín · decisores · además, 1 piloto va completando datos · próxima salida mañana a las 8:00",
      facts: [
        { key: "in_flight", value: "1", text: "en vuelo · completar datos" },
        { key: "awaiting", value: "1", text: "lote espera tu aprobación · 7 cuentas" },
        { key: "next", value: "8:00", text: "próxima salida · mañana" },
      ],
      action: { kind: "batch", run_id: "run-lot" },
    });
  });

  it("si el piloto que se nombra no tiene próxima salida, la de otro dice de cuál", () => {
    const waitingRun = summaryFixture({ id: "run-lot", status: "awaiting_approval", step: "approve", counters: { awaiting: 2 } });
    const result = ahoraMismo(
      [
        listItemFixture({ id: "r-1", name: "Ferreterías de Barranquilla", last_run: waitingRun, next_run_at: null }),
        listItemFixture({ id: "r-2", name: "Restaurantes", last_run: null, next_run_at: "2026-10-02T13:00:00Z" }),
      ],
      now,
    );
    expect(result?.context).toBe("Ferreterías de Barranquilla · próxima salida de «Restaurantes» mañana a las 8:00");
    expect(result?.facts.at(-1)).toEqual({ key: "next", value: "8:00", text: "próxima salida de «Restaurantes» · mañana" });
  });

  it("varias en vuelo y la salida de mañana; un piloto pausado no cuenta como salida", () => {
    const queued = summaryFixture({ id: "q", status: "queued" });
    const running = summaryFixture({ id: "run-2", step: "gate" });
    const result = ahoraMismo(
      [
        listItemFixture({ id: "r-1", last_run: queued, next_run_at: "2026-10-01T16:00:00Z", status: "paused" }),
        listItemFixture({ id: "r-2", last_run: running, next_run_at: "2026-10-02T13:00:00Z" }),
      ],
      now,
    );
    expect(result?.headline).toBe("2 pilotos en marcha");
    // Ninguno se nombra: la salida dice de qué piloto es.
    expect(result?.context).toBe("próxima salida de «Restaurantes de Medellín · decisores» mañana a las 8:00");
    expect(result?.facts).toEqual([
      { key: "in_flight", value: "2", text: "en vuelo" },
      { key: "next", value: "8:00", text: "próxima salida de «Restaurantes de Medellín · decisores» · mañana" },
    ]);
    expect(result?.action).toEqual({ kind: "live", run_id: "q" });
  });

  it("uno en cola dice «en cola»; la salida de otro día lleva la fecha", () => {
    const queued = summaryFixture({ id: "q", status: "queued" });
    const result = ahoraMismo([listItemFixture({ last_run: queued, next_run_at: "2026-10-05T13:00:00Z" })], now);
    expect(result?.headline).toBe("«Restaurantes de Medellín · decisores» sale en un momento");
    expect(result?.facts[0]?.text).toBe("en vuelo · en cola");
    expect(result?.facts[1]?.text).toMatch(/^próxima salida · lun 5 oct$/);
  });
});

describe("copy — «Así sale tu piloto»", () => {
  const ctx = { sourceLabel: "Google Maps", sequenceName: "Primer contacto · 4 pasos", agentName: "Sofía", channelLabels: ["Correo", "Llamada del agente"] };
  const draft = {
    ...defaultRoutineInput("America/Bogota"),
    source: { kind: "google_places", params: { category: "Restaurantes", city: "Medellín" } },
  };

  it("asistido trae la parada de tu aprobación; autónomo no", () => {
    expect(previewStops(draft, ctx).map((stop) => stop.key)).toEqual(["search", "enrich", "qualify", "promote", "gate", "approve", "contact"]);
    expect(previewStops({ ...draft, mode: "autonomous" }, ctx).map((stop) => stop.key)).not.toContain("approve");
  });

  it("cada decisión cae en su parada, dicha corta", () => {
    const stops = previewStops({ ...draft, contact: { ...draft.contact, channels: ["email", "call"] } }, ctx);
    expect(stops.map((stop) => [stop.label, stop.detail])).toEqual([
      ["Buscar", "gratis · Google Maps"],
      ["Completar datos", "sitio, teléfono y redes"],
      ["Calificar", "puntaje 60+ · revela el correo"],
      ["Pasar al CRM", "contacto con empresa"],
      ["Tu política", "bajas, RNE, horario"],
      ["Tu aprobación", "tu visto bueno al lote"],
      ["Escribirles", "correo y llamada · «Primer contacto · 4 pasos»"],
    ]);
    const phone = previewStops({ ...draft, qualify: { ...draft.qualify, reveal_phone: true } }, ctx);
    expect(phone[2]?.detail).toBe("puntaje 60+ · revela el correo y el celular");
    const none = previewStops(
      { ...draft, contact: { ...draft.contact, channels: [] }, qualify: { ...draft.qualify, reveal_email: false } },
      { ...ctx, sequenceName: null, agentName: null, channelLabels: [] },
    );
    expect(none[2]?.detail).toBe("puntaje 60+ · no revela datos");
    expect(none.at(-1)?.detail).toBe("sin canal");
  });

  it("la frase del estimado: a cuántos les escribe, en singular y plural", () => {
    expect(previewHeadline(25, { leads_revealed_per_run: 9 })).toBe("De 25 negocios, a unos 9 les escribe");
    expect(previewHeadline(25, { leads_revealed_per_run: 1 })).toBe("De 25 negocios, a uno les escribe");
    expect(previewHeadline(1, { leads_revealed_per_run: 3 })).toBe("De 1 negocio, a uno les escribe");
    expect(previewHeadline(25, null)).toBe("Trae hasta 25 negocios por salida");
    expect(previewHeadline(25, { leads_revealed_per_run: 0 })).toBe("Trae hasta 25 negocios por salida");
  });

  it("los resúmenes de los cuatro pasos cerrados", () => {
    const summary = stepSummaries({ ...draft, contact: { ...draft.contact, channels: ["email", "call"] }, schedule: { ...draft.schedule, times: ["08:00", "14:00"] } }, ctx);
    expect(summary).toEqual({
      where: "Google Maps · Restaurantes · Medellín",
      who: "Puntaje 60 o más · exige quién decide · revela el correo",
      how: "Con tu aprobación · correo y llamada · Sofía · «Primer contacto · 4 pasos»",
      when: "Lun a vie · 8:00 y 14:00 · 25 cuentas · hasta 40 créditos por salida, 600 al mes",
    });
    expect(stepSummaries({ ...draft, mode: "autonomous" }, { ...ctx, agentName: null, sequenceName: null }).how).toBe("Por su cuenta · correo");
  });
});

describe("copy — la bitácora", () => {
  const base = { id: "e", item_id: null, request_id: null, created_at: "2026-10-01T13:00:00Z" };
  const event = (kind: string, payload: Record<string, unknown>): RunEvent => ({ ...base, kind, payload });

  it("empezó y terminó, como antes", () => {
    expect(eventLine(event("step_started", { step: "await_reveal" }))).toBe("Empezó: Calificar");
    expect(eventLine(event("step_started", { step: "raro" }))).toBe("Empezó: un paso");
    expect(eventLine(event("run_finished", { status: "budget_exhausted" }))).toBe("Terminó la salida · Se acabó el tope");
    expect(eventLine(event("run_finished", { status: "raro" }))).toBe("Terminó la salida");
  });

  it("cada paso terminado con sus cifras (S1)", () => {
    const done = (step: string, counters: Record<string, number>, extra: Record<string, unknown> = {}) =>
      eventLine(event("step_completed", { step, counters, ...extra }), routine);
    expect(done("search", { found: 25 })).toBe("Buscar terminó · 25 cuentas en Google Maps");
    expect(eventLine(event("step_completed", { step: "search", counters: { found: 1 } }))).toBe("Buscar terminó · 1 cuenta");
    expect(done("enrich", { found: 25 })).toBe("Completar datos terminó · 25 cuentas con su ficha pública");
    expect(done("qualify", { qualified: 9, discarded: 16 }, { credits_spent: 9 })).toBe("Calificar terminó · 9 pasan, 16 no · 9 créditos");
    expect(done("qualify", { qualified: 1, discarded: 0 }, { credits_spent: 1 })).toBe("Calificar terminó · 1 pasa, 0 no · 1 crédito");
    expect(done("qualify", { qualified: 3, discarded: 2 })).toBe("Calificar terminó · 3 pasan, 2 no · sin gastar créditos");
    expect(done("promote", { promoted: 9 })).toBe("Pasar al CRM terminó · 9 pasaron al CRM");
    expect(done("promote", { promoted: 1 })).toBe("Pasar al CRM terminó · 1 pasó al CRM");
    expect(done("gate", { promoted: 9, blocked: 2 })).toBe("Tu política terminó · 7 pasan, 2 frenadas");
    expect(done("gate", { promoted: 2, blocked: 1 })).toBe("Tu política terminó · 1 pasa, 1 frenada");
    expect(done("gate", { blocked: 1 })).toBe("Tu política terminó · 1 frenada");
    expect(done("contact", { contacted: 7 })).toBe("Escribirles terminó · 7 en seguimiento");
    expect(done("contact", { contacted: 0, enroll_skipped: 7 })).toBe(
      "Escribirles terminó · 0 inscritas, 7 no se pudieron inscribir",
    );
    expect(done("contact", { contacted: 1, enroll_skipped: 1 })).toBe(
      "Escribirles terminó · 1 inscrita, 1 no se pudo inscribir",
    );
  });

  it("sin contadores o con un paso que no conoce, no asoma claves", () => {
    expect(eventLine(event("step_completed", { step: "search" }))).toBe("Buscar terminó · 0 cuentas");
    expect(eventLine(event("step_completed", { step: "nuevo_paso", counters: {} }))).toBe("Un paso terminó");
    expect(eventLine(event("item_discarded", {}))).toBe("Novedad de la salida");
    expect(eventLine(event("item_discarded", { detail: "Puntaje bajo" }))).toBe("Puntaje bajo");
  });
});

describe("copy — el lote", () => {
  const assisted = routineFixture();

  it("la píldora, el detalle con canales y secuencia, y el botón", () => {
    expect(batchCopy({ total: 7, approved: 7, routine: assisted, sequenceName: "Primer contacto" })).toEqual({
      pill: "7 cuentas",
      title: "Revisa a quién le escribe",
      detail: "Quita las que no quieras. A las demás les escribe por correo y llamada del agente, y siguen «Primer contacto».",
      cta: "Aprobar 7 y escribirles",
      skippedNote: "Ninguna se omite",
    });
  });

  it("singulares, y con cero aprobadas «Omitir todas y seguir»", () => {
    expect(batchCopy({ total: 1, approved: 1, routine: assisted }).pill).toBe("1 cuenta");
    expect(batchCopy({ total: 7, approved: 6, routine: assisted }).skippedNote).toBe("1 se omite");
    expect(batchCopy({ total: 7, approved: 5, routine: assisted }).skippedNote).toBe("2 se omiten");
    const none = batchCopy({ total: 7, approved: 0, routine: assisted });
    expect(none.cta).toBe("Omitir todas y seguir");
    expect(none.skippedNote).toBe("7 se omiten");
    expect(batchCopy({ total: 2, approved: 2, routine: assisted }).detail).toMatch(/y siguen la secuencia del piloto\.$/);
  });
});

describe("copy — «Lo que viene»", () => {
  it("en seguimiento, respondieron y demos, con singular", () => {
    expect(destinationRows({ following: 4, replied: 2, demo: 1 })).toEqual({
      rows: [
        { key: "following", label: "en seguimiento", count: 4 },
        { key: "replied", label: "respondieron", count: 2 },
        { key: "demo", label: "demo agendada", count: 1 },
      ],
      empty: null,
    });
    expect(destinationRows({ following: 0, replied: 1, demo: 2 }).rows.map((row) => row.label)).toEqual([
      "en seguimiento",
      "respondió",
      "demos agendadas",
    ]);
  });

  it("sin datos, quién conversa", () => {
    expect(destinationRows(null, "Sofía")).toEqual({ rows: [], empty: "Si responden, Sofía conversa y te avisa" });
    expect(destinationRows(null).empty).toBe("Si responden, el agente conversa y te avisa");
  });
});

describe("copy — la píldora de la tarjeta", () => {
  it("sale de la última salida, no de un «Programado» por defecto", () => {
    const withRun = (overrides: Parameters<typeof summaryFixture>[0]) => listItemFixture({ last_run: summaryFixture(overrides) });
    expect(routineStatusLine(withRun({ status: "failed", error: "search_timeout" }))).toEqual({ label: "Falló", tone: "destructive", live: false });
    expect(routineStatusLine(withRun({ status: "budget_exhausted" }))).toEqual({ label: "Se acabó el tope", tone: "warning", live: false });
    expect(routineStatusLine(withRun({ status: "awaiting_approval", step: "approve" })).label).toBe("Espera tu aprobación");
    expect(routineStatusLine(withRun({ status: "done", step: "contact" })).label).toBe("Terminada");
    expect(routineStatusLine(withRun({ step: "await_enrich" }))).toEqual({ label: "En vuelo · calificando", tone: "info", live: true });
  });

  it("pausado en masculino, como el piloto; sin salidas, programado o sin salidas aún", () => {
    expect(routineStatusLine(listItemFixture({ status: "paused", last_run: summaryFixture({ status: "failed" }) })).label).toBe("Pausado");
    expect(routineStatusLine(listItemFixture({ next_run_at: "2026-10-02T13:00:00Z" })).label).toBe("Programado");
    expect(routineStatusLine(listItemFixture()).label).toBe("Sin salidas aún");
  });
});
