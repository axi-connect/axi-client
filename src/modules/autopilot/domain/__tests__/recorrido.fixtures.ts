import type { Routine, RoutineListItem, RunDetail, RunSummary } from "../autopilot";

/** El piloto del mockup: Restaurantes de Medellín, asistido, Google Maps. */
export function routineFixture(overrides: Partial<Routine> = {}): Routine {
  return {
    id: "r-1",
    name: "Restaurantes de Medellín · decisores",
    mode: "assisted",
    status: "active",
    source: { kind: "google_places", params: { category: "Restaurantes", city: "Medellín" } },
    qualify: { min_score: 60, require_decision_maker: true, reveal_email: true, reveal_phone: false },
    contact: { channels: ["email", "call"], agent_id: "a-1", goal: "Agendar una demo con quien decide" },
    follow_up: { sequence_id: "s-1" },
    schedule: { days: [1, 2, 3, 4, 5], times: ["08:00", "14:00"], timezone: "America/Bogota", leads_per_run: 25 },
    budget: { per_run: 40, per_month: 600 },
    next_run_at: null,
    last_run_at: null,
    created_at: "2026-09-01T12:00:00Z",
    updated_at: "2026-09-01T12:00:00Z",
    ...overrides,
  };
}

type Item = RunDetail["items"][number];

let seq = 0;
export function itemFixture(stage: Item["stage"], reason: string | null = null, decision: string | null = null): Item {
  seq += 1;
  return {
    id: `i-${String(seq)}`,
    lead_id: `l-${String(seq)}`,
    contact_id: null,
    display_name: null,
    company_name: `Cuenta ${String(seq)}`,
    stage,
    reason,
    score: null,
    decision,
    updated_at: "2026-10-01T13:00:00Z",
  };
}

export function runFixture(overrides: Partial<RunDetail> = {}): RunDetail {
  return {
    id: "run-1",
    routine_id: "r-1",
    trigger: "schedule",
    status: "running",
    step: null,
    counters: {},
    credits_spent: 0,
    error: null,
    started_at: "2026-10-01T13:00:00Z",
    finished_at: null,
    created_at: "2026-10-01T13:00:00Z",
    items: [],
    ...overrides,
  };
}

/** Las 25 del mockup tras la política: 12 bajo el puntaje, 4 sin decisor, 1 RNE, 1 fuera de horario, 7 en el lote. */
export function mockupItems(): Item[] {
  return [
    ...Array.from({ length: 12 }, () => itemFixture("discarded", "below_min_score")),
    ...Array.from({ length: 4 }, () => itemFixture("discarded", "no_decision_maker")),
    itemFixture("discarded", "policy_rne"),
    itemFixture("discarded", "policy_outside_hours"),
    ...Array.from({ length: 7 }, () => itemFixture("contacting")),
  ];
}

/** El `last_run` de la lista: la ejecución sin sus cuentas. */
export function summaryFixture(overrides: Partial<RunSummary> = {}): RunSummary {
  const run = runFixture(overrides);
  return {
    id: run.id,
    routine_id: run.routine_id,
    trigger: run.trigger,
    status: run.status,
    step: run.step,
    counters: run.counters,
    credits_spent: run.credits_spent,
    error: run.error,
    started_at: run.started_at,
    finished_at: run.finished_at,
    created_at: run.created_at,
  };
}

export function listItemFixture(overrides: Partial<RoutineListItem> = {}): RoutineListItem {
  return { ...routineFixture(), last_run: null, ...overrides };
}
