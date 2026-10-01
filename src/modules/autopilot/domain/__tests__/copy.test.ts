import { defaultRoutineInput, RUN_STATUSES, type RunEvent } from "../autopilot";
import { ahoraMismo, eventLine, exitTitle, nextLine, nowLine, previewStops, revealCredits } from "../copy";
import { listItemFixture, routineFixture, runFixture, summaryFixture } from "./recorrido.fixtures";

const routine = routineFixture();
const autonomous = routineFixture({ mode: "autonomous" });

describe("copy — la isla «Ahora»", () => {
  it("cada paso en ejecución dice qué hace", () => {
    const line = (step: string | null, counters: Record<string, number> = {}) => nowLine(runFixture({ step, counters }), routine);
    expect(line(null)).toEqual({
      title: "Buscando restaurantes · Medellín en Google Maps",
      detail: "Trae hasta 25 cuentas. Buscar no gasta créditos.",
    });
    expect(line("await_search", { found: 25 }).title).toBe("Completando datos de 25 cuentas");
    expect(line("await_search", { found: 1 }).title).toBe("Completando datos de 1 cuenta");
    expect(line("await_enrich", { found: 25 }).detail).toBe(
      "Pasan las de puntaje 60 o más y decisor identificado. Revelar el correo cuesta 1 crédito.",
    );
    expect(line("qualify", { found: 25, qualified: 9 }).detail).toBe(
      "9 de 25 pasan tu filtro: puntaje 60 o más y decisor identificado. Revelar el correo cuesta 1 crédito.",
    );
    expect(line("await_reveal", { qualified: 9 }).title).toBe("Pasando 9 cuentas al CRM");
    expect(line("promote", { qualified: 9 }).title).toBe("Revisando tu política de contacto");
    expect(nowLine(runFixture({ step: "gate", counters: { promoted: 9, blocked: 2 } }), autonomous)).toEqual({
      title: "Inscribiendo 7 cuentas en la secuencia",
      detail: "Por correo y llamada del agente, dentro de tu horario.",
    });
  });

  it("revelar el celular cambia lo que cuesta", () => {
    const phone = routineFixture({ qualify: { ...routine.qualify, reveal_phone: true, require_decision_maker: false } });
    expect(nowLine(runFixture({ step: "await_enrich" }), phone).detail).toBe(
      "Pasan las de puntaje 60 o más. Revelar el correo y el celular cuesta 9 créditos.",
    );
    expect(revealCredits({ reveal_email: false, reveal_phone: false })).toBe(0);
  });

  it("los estados que no son «en ejecución» tienen su frase", () => {
    expect(nowLine(runFixture({ status: "queued" }), routine).title).toBe("En cola: está por despegar");
    expect(nowLine(runFixture({ status: "paused", step: "await_search" }), routine).detail).toBe(
      "La ejecución quedó en «Completar datos». Sigue donde iba cuando la reanudes.",
    );
    expect(nowLine(runFixture({ status: "awaiting_approval", step: "approve" }), routine).title).toBe("Espera tu aprobación");
    expect(nowLine(runFixture({ status: "budget_exhausted", step: "qualify", credits_spent: 40, counters: { qualified: 9 } }), routine)).toEqual({
      title: "Se acabó el tope de esta ejecución",
      detail:
        "Gastó los 40 créditos de esta ejecución al revelar. Terminó con 9 cuentas calificadas; las que no alcanzó a revelar quedan para la siguiente.",
    });
    expect(nowLine(runFixture({ status: "budget_exhausted", step: "qualify", credits_spent: 3, counters: { qualified: 1 } }), routine).detail).toMatch(
      /^Se llegó al tope del mes \(600 créditos\)\. Terminó con 1 cuenta calificada;/,
    );
    expect(nowLine(runFixture({ status: "budget_exhausted", error: "provider_out_of_credits" }), routine).title).toBe(
      "Se acabó tu saldo en el proveedor",
    );
  });

  it("falló: dice qué pasó sin la clave del error", () => {
    expect(nowLine(runFixture({ status: "failed", step: "search", error: "search_timeout" }), routine).detail).toBe(
      "No se pudo leer la fuente: Google Maps no respondió. No se gastó nada más; puedes ejecutarla de nuevo.",
    );
    const other = nowLine(runFixture({ status: "failed", step: "promote", error: "TypeError: boom" }), routine).detail;
    expect(other).toBe("Algo falló en «Revisar la política». No se gastó nada más; puedes ejecutarla de nuevo.");
    expect(other).not.toMatch(/TypeError/);
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
      "Ninguna cuenta pasó tu filtro: puntaje 60 o más y decisor identificado.",
    );
    expect(nowLine(done({}), routine).title).toBe("Terminada sin cuentas nuevas");
  });

  it("los siete estados tienen título y detalle", () => {
    for (const status of RUN_STATUSES) {
      const line = nowLine(runFixture({ status, step: "await_search", counters: { found: 2 } }), routine);
      expect(line.title.length).toBeGreaterThan(0);
      expect(line.detail.length).toBeGreaterThan(0);
    }
  });

  it("«Después» nombra la parada siguiente y calla al terminar", () => {
    expect(nextLine(runFixture({ status: "queued" }), routine)).toBe("Después: Buscar");
    expect(nextLine(runFixture({ step: "await_search" }), routine)).toBe("Después: Calificar y revelar");
    expect(nextLine(runFixture({ status: "awaiting_approval", step: "approve" }), routine)).toBe("Después: Inscribir en la secuencia");
    expect(nextLine(runFixture({ step: "gate" }), autonomous)).toBeNull();
    for (const status of ["done", "failed", "budget_exhausted"] as const) {
      expect(nextLine(runFixture({ status, step: "await_search" }), routine)).toBeNull();
    }
  });
});

describe("copy — las salidas", () => {
  it("cada parada con su frase, en singular y plural", () => {
    expect(exitTitle({ at: "qualify", total: 16 })).toBe("16 no pasaron tu filtro");
    expect(exitTitle({ at: "qualify", total: 1 })).toBe("1 no pasó tu filtro");
    expect(exitTitle({ at: "promote", total: 2 })).toBe("2 no pasaron al CRM");
    expect(exitTitle({ at: "gate", total: 2 })).toBe("2 frenadas por tu política");
    expect(exitTitle({ at: "gate", total: 1 })).toBe("1 frenada por tu política");
    expect(exitTitle({ at: "approve", total: 1 })).toBe("1 la omitiste");
    expect(exitTitle({ at: "approve", total: 3 })).toBe("3 las omitiste");
    expect(exitTitle({ at: "search", total: 1 })).toBe("1 salió del recorrido");
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

  it("un piloto en vuelo, un lote que espera y la próxima salida", () => {
    const flyingRun = summaryFixture({ id: "run-fly", step: "await_search", counters: { found: 25 } });
    const waitingRun = summaryFixture({ id: "run-lot", status: "awaiting_approval", step: "approve", counters: { awaiting: 7 } });
    const result = ahoraMismo(
      [
        listItemFixture({ id: "r-1", last_run: flyingRun, next_run_at: "2026-10-01T19:00:00Z" }),
        listItemFixture({ id: "r-2", last_run: waitingRun, next_run_at: "2026-10-02T13:00:00Z" }),
      ],
      now,
    );
    expect(result).toEqual({
      facts: [
        { key: "in_flight", value: "1", text: "en vuelo · completar datos" },
        { key: "awaiting", value: "1", text: "lote espera tu aprobación · 7 cuentas" },
        { key: "next", value: "14:00", text: "próxima salida · hoy" },
      ],
      action: { kind: "batch", run_id: "run-lot" },
    });
  });

  it("varios en vuelo y la salida de mañana; un piloto pausado no cuenta como salida", () => {
    const queued = summaryFixture({ id: "q", status: "queued" });
    const running = summaryFixture({ id: "run-2", step: "gate" });
    const result = ahoraMismo(
      [
        listItemFixture({ id: "r-1", last_run: queued, next_run_at: "2026-10-01T16:00:00Z", status: "paused" }),
        listItemFixture({ id: "r-2", last_run: running, next_run_at: "2026-10-02T13:00:00Z" }),
      ],
      now,
    );
    expect(result?.facts).toEqual([
      { key: "in_flight", value: "2", text: "en vuelo" },
      { key: "next", value: "8:00", text: "próxima salida · mañana" },
    ]);
    expect(result?.action).toEqual({ kind: "live", run_id: "q" });
  });

  it("uno en cola dice «en cola»; la salida de otro día lleva la fecha", () => {
    const queued = summaryFixture({ id: "q", status: "queued" });
    const result = ahoraMismo([listItemFixture({ last_run: queued, next_run_at: "2026-10-05T13:00:00Z" })], now);
    expect(result?.facts[0]?.text).toBe("en vuelo · en cola");
    expect(result?.facts[1]?.text).toMatch(/^próxima salida · lun 5 oct$/);
  });
});

describe("copy — «Así vuela tu piloto»", () => {
  const ctx = { sourceLabel: "Google Maps", sequenceName: "Primer contacto · 4 pasos", agentName: "Sofía", channelLabels: ["Correo", "Llamada del agente"] };
  const draft = {
    ...defaultRoutineInput("America/Bogota"),
    source: { kind: "google_places", params: { category: "Restaurantes", city: "Medellín" } },
  };

  it("asistido trae la parada de tu aprobación; autónomo no", () => {
    expect(previewStops(draft, ctx).map((stop) => stop.key)).toEqual(["search", "enrich", "qualify", "promote", "gate", "approve", "contact"]);
    expect(previewStops({ ...draft, mode: "autonomous" }, ctx).map((stop) => stop.key)).not.toContain("approve");
  });

  it("cada decisión cae en su parada", () => {
    const stops = previewStops(draft, ctx);
    expect(stops[0]?.detail).toBe("Google Maps · Restaurantes · Medellín · 25 cuentas por ejecución. Buscar no gasta créditos.");
    expect(stops[2]?.detail).toBe("Puntaje 60 o más · exige quién decide · revela el correo (1 crédito por cuenta, solo si lo encuentra).");
    expect(stops[6]?.detail).toBe("Correo y Llamada del agente · «Primer contacto · 4 pasos» · si responden, conversa Sofía.");
    const phone = previewStops({ ...draft, qualify: { ...draft.qualify, reveal_phone: true } }, ctx);
    expect(phone[2]?.detail).toMatch(/revela el correo y el celular \(9 créditos por cuenta/);
    const none = previewStops(
      { ...draft, qualify: { ...draft.qualify, reveal_email: false, require_decision_maker: false } },
      { ...ctx, sequenceName: null, agentName: null, channelLabels: [] },
    );
    expect(none[2]?.detail).toBe("Puntaje 60 o más · no revela datos (no gasta créditos).");
    expect(none[6]?.detail).toBe("Sin canal · la secuencia que elijas.");
  });
});

describe("copy — la bitácora", () => {
  const base = { id: "e", item_id: null, request_id: null, created_at: "2026-10-01T13:00:00Z" };
  const event = (kind: string, payload: Record<string, unknown>): RunEvent => ({ ...base, kind, payload });

  it("empezó y terminó, como antes", () => {
    expect(eventLine(event("step_started", { step: "await_reveal" }))).toBe("Empezó: Calificar y revelar");
    expect(eventLine(event("step_started", { step: "raro" }))).toBe("Empezó: un paso");
    expect(eventLine(event("run_finished", { status: "budget_exhausted" }))).toBe("Terminó la ejecución · Se acabó el tope");
    expect(eventLine(event("run_finished", { status: "raro" }))).toBe("Terminó la ejecución");
  });

  it("cada paso terminado con sus cifras (S1)", () => {
    const done = (step: string, counters: Record<string, number>, extra: Record<string, unknown> = {}) =>
      eventLine(event("step_completed", { step, counters, ...extra }), routine);
    expect(done("search", { found: 25 })).toBe("Buscar terminó · 25 cuentas en Google Maps");
    expect(eventLine(event("step_completed", { step: "search", counters: { found: 1 } }))).toBe("Buscar terminó · 1 cuenta");
    expect(done("enrich", { found: 25 })).toBe("Completar datos terminó · 25 cuentas con su ficha pública");
    expect(done("qualify", { qualified: 9, discarded: 16 }, { credits_spent: 9 })).toBe("Calificar y revelar terminó · 9 pasan, 16 no · 9 créditos");
    expect(done("qualify", { qualified: 1, discarded: 0 }, { credits_spent: 1 })).toBe("Calificar y revelar terminó · 1 pasa, 0 no · 1 crédito");
    expect(done("qualify", { qualified: 3, discarded: 2 })).toBe("Calificar y revelar terminó · 3 pasan, 2 no · sin gastar créditos");
    expect(done("promote", { promoted: 9 })).toBe("Pasar al CRM terminó · 9 pasaron al CRM");
    expect(done("promote", { promoted: 1 })).toBe("Pasar al CRM terminó · 1 pasó al CRM");
    expect(done("gate", { promoted: 9, blocked: 2 })).toBe("Revisar la política terminó · 7 pasan, 2 frenadas");
    expect(done("gate", { promoted: 2, blocked: 1 })).toBe("Revisar la política terminó · 1 pasa, 1 frenada");
    expect(done("gate", { blocked: 1 })).toBe("Revisar la política terminó · 1 frenada");
    expect(done("contact", { contacted: 7 })).toBe("Inscribir en la secuencia terminó · 7 en seguimiento");
  });

  it("sin contadores o con un paso que no conoce, no asoma claves", () => {
    expect(eventLine(event("step_completed", { step: "search" }))).toBe("Buscar terminó · 0 cuentas");
    expect(eventLine(event("step_completed", { step: "nuevo_paso", counters: {} }))).toBe("Un paso terminó");
    expect(eventLine(event("item_discarded", {}))).toBe("Novedad de la ejecución");
    expect(eventLine(event("item_discarded", { detail: "Puntaje bajo" }))).toBe("Puntaje bajo");
  });
});
