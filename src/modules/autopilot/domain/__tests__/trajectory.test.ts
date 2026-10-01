import { RUN_STATUSES } from "../autopilot";
import { reasonLabel, reasonShortLabel, reasonStop } from "../reasons";
import { runTrajectory, stepProgress } from "../trajectory";
import { itemFixture, mockupItems, routineFixture, runFixture } from "./recorrido.fixtures";

const assisted = routineFixture();
const autonomous = routineFixture({ mode: "autonomous" });

const keys = (routine = assisted) => runTrajectory(runFixture(), routine).stops.map((stop) => stop.key);
const states = (run: Parameters<typeof runTrajectory>[0], routine = assisted) =>
  runTrajectory(run, routine).stops.map((stop) => stop.state);

describe("reasons — el motivo en palabras, nunca la clave", () => {
  it("los del piloto, con el puntaje del piloto", () => {
    expect(reasonLabel("below_min_score", assisted)).toBe("Puntaje por debajo de 60");
    expect(reasonLabel("below_min_score")).toBe("Puntaje por debajo del mínimo");
    expect(reasonLabel("no_decision_maker")).toBe("No se identificó quién decide");
    expect(reasonLabel("lead_gone")).toBe("La cuenta ya no está disponible");
    expect(reasonLabel("skipped_in_batch")).toBe("La omitiste en el lote");
  });

  it("los de la política salen del mapa compartido, con los que el mapa no trae", () => {
    expect(reasonLabel("policy_rne")).toBe("Está inscrito en el Registro de Números Excluidos (RNE)");
    expect(reasonLabel("policy_outside_hours")).toBe("Fuera del horario prudente; sale en la siguiente franja");
    expect(reasonLabel("policy_opted_out")).toBe("Se dio de baja: no se le contacta");
    expect(reasonLabel("policy_daily_cap")).toMatch(/tope diario/);
    expect(reasonLabel("policy_blocked")).toBe("Tu política de contacto no lo permite");
    expect(reasonLabel("policy_algo_nuevo")).toBe("Tu política de contacto no lo permite");
  });

  it("pasar al CRM: «No pasó al CRM: …», también con un código que no conoce", () => {
    expect(reasonLabel("promote_prospecting/lead_not_identifiable")).toBe("No pasó al CRM: no tiene teléfono ni correo");
    expect(reasonLabel("promote_prospecting/otra_cosa")).toBe("No pasó al CRM");
  });

  it("lo desconocido o vacío no asoma la clave", () => {
    for (const reason of ["algo_raro", "", null]) {
      expect(reasonLabel(reason)).toBe("Se quedó en el camino");
      expect(reasonShortLabel(reason)).toBe("Se quedó en el camino");
    }
    expect(reasonShortLabel("below_min_score", assisted)).toBe("Puntaje bajo 60");
    expect(reasonShortLabel("policy_rne")).toBe("Registro de Números Excluidos");
    expect(reasonShortLabel("skipped_in_batch")).toBe("En el lote");
  });

  it("inscribir: los motivos de la secuencia, en palabras", () => {
    expect(reasonLabel("enroll_no_channel")).toBe("No hay por dónde escribirle con los canales de la secuencia");
    expect(reasonLabel("enroll_opted_out")).toBe("Se dio de baja");
    expect(reasonLabel("enroll_task_open")).toBe("Ya va en una secuencia o tiene una tarea abierta");
    expect(reasonLabel("enroll_not_enrolled")).toBe("La secuencia no lo inscribió (¿está activa?)");
    expect(reasonLabel("enroll_algo_nuevo")).toBe("No se pudo inscribir en la secuencia");
    expect(reasonStop("enroll_no_channel")).toBe("contact");
  });

  it("cada motivo sale por su parada", () => {
    expect(["below_min_score", "no_decision_maker", "lead_gone", "promote_x", "policy_rne", "skipped_in_batch", "x", null].map(reasonStop)).toEqual([
      "qualify",
      "qualify",
      "qualify",
      "promote",
      "gate",
      "approve",
      null,
      null,
    ]);
  });
});

describe("trajectory — las paradas", () => {
  it("«Con tu aprobación» lleva «Tu aprobación» entre tu política y escribirles; «Por su cuenta» no", () => {
    expect(keys()).toEqual(["search", "enrich", "qualify", "promote", "gate", "approve", "contact"]);
    expect(keys(autonomous)).toEqual(["search", "enrich", "qualify", "promote", "gate", "contact"]);
    const approve = runTrajectory(runFixture(), assisted).stops[5];
    expect(approve).toMatchObject({ label: "Tu aprobación", gate: true, sub: "revisas el lote" });
    expect(runTrajectory(runFixture(), assisted).stops.filter((stop) => stop.gate).map((stop) => stop.key)).toEqual(["gate", "approve"]);
  });

  it("en cola: nada empezó y ninguna cifra", () => {
    const trajectory = runTrajectory(runFixture({ status: "queued" }), assisted);
    expect(trajectory.currentIndex).toBe(-1);
    expect(trajectory.stops.every((stop) => stop.state === "todo" && stop.count === null)).toBe(true);
    expect(trajectory.exits).toEqual([]);
  });

  it("en ejecución: la parada encendida es la que no ha cerrado su último paso", () => {
    expect(runTrajectory(runFixture({ step: null }), assisted).currentIndex).toBe(0);
    expect(runTrajectory(runFixture({ step: "search" }), assisted).currentIndex).toBe(0);
    expect(runTrajectory(runFixture({ step: "await_search", counters: { found: 25 } }), assisted).currentIndex).toBe(1);
    expect(runTrajectory(runFixture({ step: "qualify", counters: { found: 25, qualified: 9 } }), assisted).currentIndex).toBe(2);
    expect(runTrajectory(runFixture({ step: "await_reveal" }), assisted).currentIndex).toBe(3);
    expect(runTrajectory(runFixture({ step: "gate" }), assisted).currentIndex).toBe(5);
    expect(runTrajectory(runFixture({ step: "gate" }), autonomous).currentIndex).toBe(5);
    // Aprobado el lote, el paso sigue en `approve` mientras inscribe.
    expect(runTrajectory(runFixture({ step: "approve" }), assisted).currentIndex).toBe(6);
    expect(states(runFixture({ step: "await_search", counters: { found: 25 } }))).toEqual([
      "done",
      "now",
      "todo",
      "todo",
      "todo",
      "todo",
      "todo",
    ]);
  });

  it("espera tu aprobación: la parada del lote en espera, con su tamaño", () => {
    const run = runFixture({
      status: "awaiting_approval",
      step: "approve",
      counters: { found: 25, qualified: 9, discarded: 16, promoted: 9, blocked: 2, awaiting: 7 },
      items: mockupItems(),
    });
    const trajectory = runTrajectory(run, assisted);
    expect(trajectory.currentIndex).toBe(5);
    expect(trajectory.stops.map((stop) => stop.state)).toEqual(["done", "done", "done", "done", "done", "wait", "todo"]);
    expect(trajectory.stops.map((stop) => stop.count)).toEqual([25, 25, 9, 9, 7, 7, null]);
  });

  it("pausada, se acabó el tope y falló dejan la parada donde iba", () => {
    expect(states(runFixture({ status: "paused", step: "await_reveal", counters: { found: 25, qualified: 9 } }))[3]).toBe("now");
    const budget = runTrajectory(runFixture({ status: "budget_exhausted", step: "qualify", counters: { found: 25, qualified: 9 } }), assisted);
    expect(budget.currentIndex).toBe(2);
    expect(budget.stops[2]).toMatchObject({ state: "now", count: 9 });
    expect(budget.stops[3]).toMatchObject({ state: "todo", count: null });
    const failed = runTrajectory(runFixture({ status: "failed", step: "search", error: "search_timeout" }), assisted);
    expect(failed.stops[0]).toMatchObject({ state: "fail", count: null });
  });

  it("pausada con el lote sin decidir sigue en tu aprobación", () => {
    const run = runFixture({ status: "paused", step: "approve", counters: { awaiting: 2 }, items: [itemFixture("contacting"), itemFixture("contacting")] });
    expect(runTrajectory(run, assisted).currentIndex).toBe(5);
  });

  it("terminada: todo hecho, con las cifras de cada parada", () => {
    const items = mockupItems().map((item, index) =>
      item.stage !== "contacting" ? item : index === 24 ? { ...item, stage: "discarded" as const, reason: "skipped_in_batch", decision: "skipped" } : { ...item, stage: "following" as const, decision: "approved" },
    );
    const run = runFixture({
      status: "done",
      step: "contact",
      counters: { found: 25, qualified: 9, discarded: 16, promoted: 9, blocked: 2, awaiting: 7, contacted: 6, batch_skipped: 1 },
      items,
    });
    const trajectory = runTrajectory(run, assisted);
    expect(trajectory.currentIndex).toBe(7);
    expect(trajectory.stops.every((stop) => stop.state === "done")).toBe(true);
    expect(trajectory.stops.map((stop) => stop.count)).toEqual([25, 25, 9, 9, 7, 6, 6]);
  });

  it("una ejecución sin cuentas termina en cero, no en «aún no»", () => {
    const trajectory = runTrajectory(runFixture({ status: "done", step: "await_search", counters: { found: 0 } }), autonomous);
    expect(trajectory.stops.map((stop) => stop.count)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(trajectory.exits).toEqual([]);
  });

  it("sin contadores no inventa cifras", () => {
    const trajectory = runTrajectory(runFixture({ step: "await_reveal", counters: {} }), assisted);
    expect(trajectory.stops.map((stop) => stop.count)).toEqual([null, null, null, null, null, null, null]);
  });

  it("las ejecuciones de antes de `promoted` lo deducen", () => {
    const counters = { found: 25, qualified: 9, blocked: 2, awaiting: 7 };
    const stops = runTrajectory(runFixture({ status: "awaiting_approval", step: "approve", counters }), assisted).stops;
    expect(stops[3]?.count).toBe(9);
    const promoteExit = [itemFixture("discarded", "promote_prospecting/suppressed")];
    const atGate = runTrajectory(runFixture({ step: "promote", counters: { found: 25, qualified: 9 }, items: promoteExit }), assisted);
    expect(atGate.stops[3]?.count).toBe(8);
  });
});

describe("trajectory — las salidas", () => {
  it("cada descartada sale por su parada, con su motivo en corto y de mayor a menor", () => {
    const run = runFixture({ status: "awaiting_approval", step: "approve", counters: { awaiting: 7 }, items: mockupItems() });
    const exits = runTrajectory(run, assisted).exits;
    expect(exits.map((exit) => [exit.at, exit.total])).toEqual([
      ["qualify", 16],
      ["gate", 2],
    ]);
    expect(exits[0]?.rows).toEqual([
      { reason: "below_min_score", label: "Puntaje bajo 60", count: 12 },
      { reason: "no_decision_maker", label: "Sin decisor identificado", count: 4 },
    ]);
    expect(exits[1]?.rows.map((row) => row.label)).toEqual(["Fuera de horario hábil", "Registro de Números Excluidos"]);
  });

  it("un motivo desconocido sale por la parada donde iba, sin la clave", () => {
    const run = runFixture({ step: "await_enrich", items: [itemFixture("discarded", "motivo_nuevo")] });
    const [exit] = runTrajectory(run, assisted).exits;
    expect(exit).toEqual({ at: "qualify", total: 1, rows: [{ reason: "motivo_nuevo", label: "Se quedó en el camino", count: 1 }] });
  });

  it("sin `items` (la tarjeta de la lista) solo trae los totales de los contadores", () => {
    const run = { status: "done" as const, step: "contact", counters: { found: 25, qualified: 9, discarded: 16, blocked: 2, awaiting: 7, contacted: 6, batch_skipped: 1 } };
    expect(runTrajectory(run, assisted).exits).toEqual([
      { at: "qualify", total: 16, rows: [] },
      { at: "gate", total: 2, rows: [] },
      { at: "approve", total: 1, rows: [] },
    ]);
    expect(runTrajectory(run, autonomous).exits.map((exit) => exit.at)).toEqual(["qualify", "gate"]);
  });
});

describe("trajectory — lo que la secuencia no inscribió", () => {
  const counters = { found: 10, qualified: 10, promoted: 10, blocked: 2, awaiting: 8, batch_skipped: 1, contacted: 0, enroll_skipped: 7 };

  it("sale por «Inscribir en la secuencia» con su motivo", () => {
    const items = [
      ...Array.from({ length: 7 }, () => itemFixture("discarded", "enroll_no_channel", "approved")),
      itemFixture("discarded", "skipped_in_batch", "skipped"),
      itemFixture("discarded", "policy_no_identity"),
      itemFixture("discarded", "policy_no_identity"),
    ];
    const trajectory = runTrajectory(runFixture({ status: "done", step: "contact", counters, items }), assisted);
    expect(trajectory.exits.find((exit) => exit.at === "contact")).toEqual({
      at: "contact",
      total: 7,
      rows: [{ reason: "enroll_no_channel", label: "Sin canal para la secuencia", count: 7 }],
    });
    expect(trajectory.stops.map((stop) => stop.count)).toEqual([10, 10, 10, 10, 8, 7, 0]);
  });

  it("una ejecución vieja (sin el motivo) la cuenta por el total del contador", () => {
    const items = Array.from({ length: 7 }, () => itemFixture("following", null, "approved"));
    const exits = runTrajectory(runFixture({ status: "done", step: "contact", counters, items }), assisted).exits;
    expect(exits.find((exit) => exit.at === "contact")).toEqual({ at: "contact", total: 7, rows: [] });
  });

  it("sin items, también del contador", () => {
    const run = { status: "done" as const, step: "contact", counters };
    expect(runTrajectory(run, assisted).exits.find((exit) => exit.at === "contact")?.total).toBe(7);
  });
});

describe("trajectory — los siete estados", () => {
  it("cada estado da un recorrido coherente", () => {
    for (const status of RUN_STATUSES) {
      const trajectory = runTrajectory(runFixture({ status, step: status === "queued" ? null : "await_search", counters: { found: 3 } }), assisted);
      expect(trajectory.stops).toHaveLength(7);
      expect(trajectory.currentIndex).toBeGreaterThanOrEqual(-1);
      expect(trajectory.currentIndex).toBeLessThanOrEqual(7);
    }
  });
});

describe("trajectory — nombre corto y lo que hace cada parada", () => {
  it("los nombres de las rutas y su `sub`, con la secuencia si se conoce", () => {
    const stops = runTrajectory(runFixture(), assisted, { sequenceName: "Primer contacto" }).stops;
    expect(stops.map((stop) => [stop.label, stop.sub])).toEqual([
      ["Buscar", "gratis"],
      ["Completar datos", "sitio, teléfono, redes"],
      ["Calificar", "revela el correo"],
      ["Pasar al CRM", "contacto + empresa"],
      ["Tu política", "bajas, RNE, horario"],
      ["Tu aprobación", "revisas el lote"],
      ["Escribirles", "«Primer contacto»"],
    ]);
    expect(runTrajectory(runFixture(), assisted).stops.at(-1)?.sub).toBe("tu secuencia");
  });

  it("«Calificar» dice qué revela", () => {
    const sub = (reveal_email: boolean, reveal_phone: boolean) =>
      runTrajectory(runFixture(), routineFixture({ qualify: { ...assisted.qualify, reveal_email, reveal_phone } })).stops[2]?.sub;
    expect(sub(true, false)).toBe("revela el correo");
    expect(sub(true, true)).toBe("revela correo y celular");
    expect(sub(false, true)).toBe("revela el celular");
    expect(sub(false, false)).toBe("no revela datos");
  });
});

describe("trajectory — la hora de cada parada", () => {
  const closed = (step: string, at: string) => ({ kind: "step_completed", payload: { step }, created_at: at });
  const events = [
    { kind: "step_started", payload: { step: "search" }, created_at: "2026-10-01T13:00:00Z" },
    closed("search", "2026-10-01T13:01:00Z"),
    closed("enrich", "2026-10-01T13:03:00Z"),
    // Un cierre repetido (un reintento viejo) no cambia la hora: manda el primero.
    closed("enrich", "2026-10-01T13:09:00Z"),
  ];

  it("sale del primer step_completed, en la zona de la ruta; la parada en curso dice «ahora»", () => {
    const run = runFixture({ step: "await_enrich", counters: { found: 25 } });
    const stops = runTrajectory(run, assisted, { events }).stops;
    expect(stops.map((stop) => stop.time)).toEqual(["8:01", "8:03", "ahora", null, null, null, null]);
  });

  it("sin bitácora, o en pausa, no inventa la hora", () => {
    const run = runFixture({ step: "await_enrich", counters: { found: 25 } });
    expect(runTrajectory(run, assisted).stops.map((stop) => stop.time)).toEqual([null, null, "ahora", null, null, null, null]);
    const paused = runTrajectory({ ...run, status: "paused" }, assisted, { events }).stops;
    expect(paused[2]?.time).toBeNull();
    // «Tu aprobación» no se narra en el servidor: aunque esté hecha, va sin hora.
    const done = runTrajectory(runFixture({ status: "done", step: "contact" }), assisted, { events }).stops;
    expect(done[5]?.time).toBeNull();
  });
});

describe("trajectory — el peaje y «Lo que viene»", () => {
  it("los créditos aparecen al llegar a «Calificar»", () => {
    expect(runTrajectory(runFixture({ step: "await_search", credits_spent: 0 }), assisted).credits).toBeNull();
    expect(runTrajectory(runFixture({ step: "qualify", credits_spent: 9 }), assisted).credits).toBe(9);
    expect(runTrajectory({ status: "done", step: "contact", counters: {} }, assisted).credits).toBeNull();
  });

  it("dónde van las que siguieron, por etapa; null sin items o sin ninguna", () => {
    const items = [
      itemFixture("following"),
      itemFixture("following"),
      itemFixture("replied"),
      itemFixture("demo"),
      itemFixture("discarded", "below_min_score"),
    ];
    expect(runTrajectory(runFixture({ status: "done", step: "contact", items }), assisted).destination).toEqual({
      following: 2,
      replied: 1,
      demo: 1,
    });
    expect(runTrajectory(runFixture({ items: [itemFixture("contacting")] }), assisted).destination).toBeNull();
    expect(runTrajectory({ status: "done", step: "contact", counters: {} }, assisted).destination).toBeNull();
  });
});

describe("trajectory — «paso X de N»", () => {
  it("cuenta las mismas paradas que la miniatura", () => {
    expect(stepProgress(runFixture({ step: "await_search" }), assisted)).toEqual({ current: 2, total: 7 });
    expect(stepProgress(runFixture({ step: "await_search" }), autonomous)).toEqual({ current: 2, total: 6 });
    expect(stepProgress(runFixture({ status: "awaiting_approval", step: "approve" }), assisted)).toEqual({ current: 6, total: 7 });
    expect(stepProgress(runFixture({ status: "queued" }), assisted)).toBeNull();
    expect(stepProgress(runFixture({ status: "done", step: "contact" }), assisted)).toBeNull();
  });
});
