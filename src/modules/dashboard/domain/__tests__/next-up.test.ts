import { aiStatusLine, nextUpActions, nextUpHeadline, nextUpItems, type NextUpInput } from "../next-up";
import type { InboxCountsDTO, OrderStatsDTO, UsageSummaryDTO } from "../dashboard";
import type { ChannelHealth } from "../health";

const attention = (patch: Partial<InboxCountsDTO> = {}): InboxCountsDTO => ({
  queued: 4,
  mine: 3,
  ai: 16,
  all_open: 23,
  unread_total: 9,
  ...patch,
});
const sales = (pending: number): OrderStatsDTO =>
  ({ kpis: { pending_verification: pending } }) as unknown as OrderStatsDTO;
const usage = (aiPaused: boolean): UsageSummaryDTO =>
  ({ ai_paused: aiPaused, metrics: [], cost: { used_usd: 0, limit: null } }) as unknown as UsageSummaryDTO;
const channel = (patch: Partial<ChannelHealth>): ChannelHealth => ({
  id: "ch-1",
  name: "@dermalux.clinica",
  kind: "instagram_dm",
  status: "connected",
  level: "ok",
  ...patch,
});
const input = (patch: Partial<NextUpInput> = {}): NextUpInput => ({
  attention: attention(),
  sales: sales(2),
  channels: [channel({})],
  usage: usage(false),
  kindLabel: (kind) => (kind === "instagram_dm" ? "Instagram" : kind),
  ...patch,
});

describe("nextUpItems", () => {
  it("un día normal: cola, asignadas y pagos, con sus cifras", () => {
    const items = nextUpItems(input());
    expect(items.map((item) => [item.key, item.count, item.title])).toEqual([
      ["queued", 4, "esperan en cola"],
      ["mine", 3, "asignadas a ti"],
      ["payments", 2, "pagos por verificar"],
    ]);
    expect(items[1].detail).toBe("9 sin leer en todo el inbox");
    expect(nextUpHeadline(items)).toBe("Esto te espera ahora");
  });

  it("lo caído va primero y cambia el titular; sin IA la cola la contesta el equipo", () => {
    const items = nextUpItems(
      input({ channels: [channel({ level: "critical", status: "disconnected" })], usage: usage(true) }),
    );
    expect(items.map((item) => item.key)).toEqual(["channel-ch-1", "ai-paused", "queued", "mine", "payments"]);
    expect(items[0]).toMatchObject({
      tone: "destructive",
      title: "Instagram se desconectó",
      detail: "los mensajes de @dermalux.clinica no entran",
      action: { label: "Reconectar Instagram", href: "/settings/channels" },
    });
    expect(items[2].detail).toBe("sin IA, las contesta tu equipo");
    expect(nextUpHeadline(items)).toBe("No puede esperar");
  });

  it("singular cuando es una, y nada de lo que el rol no puede leer", () => {
    const items = nextUpItems(input({ attention: attention({ queued: 1, mine: 0 }), sales: null, channels: null, usage: null }));
    expect(items.map((item) => item.title)).toEqual(["espera en cola"]);
  });

  it("sin nada pendiente, ninguna fila", () => {
    expect(nextUpItems(input({ attention: attention({ queued: 0, mine: 0 }), sales: sales(0) }))).toEqual([]);
  });
});

describe("nextUpActions", () => {
  it("la acción de la fila más grave y la siguiente distinta, sin repetir el inbox", () => {
    expect(nextUpActions(nextUpItems(input())).map((action) => action.label)).toEqual(["Ir al inbox", "Ver pagos"]);
    const urgent = nextUpItems(input({ channels: [channel({ level: "critical" })], usage: usage(true) }));
    expect(nextUpActions(urgent).map((action) => action.label)).toEqual(["Reconectar Instagram", "Ver el plan"]);
  });
});

describe("aiStatusLine", () => {
  it("cuenta lo que atiende la IA de lo abierto", () => {
    expect(aiStatusLine(attention(), usage(false))).toBe("La IA atiende 16 de las 23 abiertas");
    expect(aiStatusLine(attention({ ai: 5, all_open: 5 }), null)).toBe("La IA atiende las 5 abiertas");
    expect(aiStatusLine(attention({ ai: 1, all_open: 1 }), null)).toBe("La IA atiende la única abierta");
  });

  it("calla si la IA está en pausa, no atiende nada o no hay datos", () => {
    expect(aiStatusLine(attention(), usage(true))).toBeNull();
    expect(aiStatusLine(attention({ ai: 0 }), null)).toBeNull();
    expect(aiStatusLine(null, null)).toBeNull();
  });
});
