import type { AgentDigestDTO, TaskStatsDTO } from "../activity";
import { tasksNextUp } from "../tasks-next-up";

const stats = (over: Partial<TaskStatsDTO> = {}): TaskStatsDTO => ({
  open: 14,
  overdue: 2,
  due_today: 6,
  unassigned: 1,
  agent: { open: 18, deferred: 3, failed: 1, awaiting: 5, converted: 3 },
  ...over,
});
const digest = (counts: Partial<AgentDigestDTO["counts"]>): AgentDigestDTO => ({
  window: "today",
  day: "2026-09-26",
  counts: { reached: 0, replied: 0, converted: 0, calls_connected: 0, failed: 0, ...counts },
});

describe("tasksNextUp — bandeja mezclada: lo que no espera", () => {
  it("las vencidas mandan y nombran la primera cargada", () => {
    expect(
      tasksNextUp({ agentMode: false, stats: stats(), digest: null, firstOverdue: { title: "Llamar para confirmar", contact: "Luis Pardo" } }),
    ).toEqual({ kind: "overdue", count: 2, title: "2 vencidas", detail: "La primera: Llamar para confirmar con Luis Pardo." });
  });
  it("una sola vencida en singular, y sin la primera cargada no la inventa", () => {
    expect(tasksNextUp({ agentMode: false, stats: stats({ overdue: 1 }), digest: null, firstOverdue: null })).toMatchObject({
      title: "1 vencida",
      detail: "Tenían fecha y siguen abiertas.",
    });
  });
  it("sin vencidas, lo de hoy; sin nada, al día", () => {
    expect(tasksNextUp({ agentMode: false, stats: stats({ overdue: 0 }), digest: null, firstOverdue: null })).toMatchObject({ kind: "today", title: "6 para hoy" });
    expect(tasksNextUp({ agentMode: false, stats: stats({ overdue: 0, due_today: 0 }), digest: null, firstOverdue: null })).toMatchObject({ kind: "clear", title: "Todo al día" });
  });
});

describe("tasksNextUp — modo agente: el parte de Axi", () => {
  it("lo que acabó en compra va primero; el resto y lo que no salió, en la frase", () => {
    const next = tasksNextUp({ agentMode: true, stats: stats(), digest: digest({ converted: 3, reached: 12, replied: 5, failed: 1 }), firstOverdue: null });
    expect(next).toMatchObject({ kind: "agent", title: "3 en compra", failed: 1 });
    expect(next.detail).toBe("Además: 12 seguimientos · 5 respondieron. 1 no se pudo enviar.");
  });
  it("sin resultados pero con fallos, el fallo es el titular", () => {
    expect(tasksNextUp({ agentMode: true, stats: stats(), digest: digest({ failed: 2 }), firstOverdue: null })).toMatchObject({ title: "2 sin enviar", failed: 2 });
  });
  it("sin parte, cuenta lo programado; todo salido lo dice", () => {
    expect(tasksNextUp({ agentMode: true, stats: stats({ agent: { open: 1, deferred: 0, failed: 0, awaiting: 0, converted: 0 } }), digest: null, firstOverdue: null })).toMatchObject({
      title: "Sin movimiento todavía",
      detail: "1 seguimiento programado; aquí verás lo que salga.",
    });
    expect(tasksNextUp({ agentMode: true, stats: stats(), digest: digest({ reached: 4 }), firstOverdue: null }).detail).toBe("Todo lo programado salió.");
  });
});
