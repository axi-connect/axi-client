import type { AgentDigestDTO, TaskStatsDTO } from "./activity";
import { agentDigestFigures } from "./agent-digest";

/**
 * «Lo próximo» de la bandeja de tareas (plan `crm_premium_plan.md` §3; lienzo
 * CRM premium F3). Puro: la UI solo pinta.
 *
 * - Bandeja mezclada: lo que no espera, por gravedad —vencidas → para hoy →
 *   al día—.
 * - Modo agente: el parte de Axi (la isla absorbe la línea del parte), con lo
 *   que no salió como la única acción.
 */
export type TasksNextUp =
  | { kind: "overdue"; count: number; title: string; detail: string }
  | { kind: "today"; count: number; title: string; detail: string }
  | { kind: "clear"; title: string; detail: string }
  | { kind: "agent"; title: string; detail: string; failed: number; window: "today" | "yesterday" };

function plural(value: number, one: string, many: string): string {
  return value === 1 ? one : many;
}

export function tasksNextUp(input: {
  agentMode: boolean;
  stats: TaskStatsDTO;
  digest: AgentDigestDTO | null;
  /** La primera vencida ya cargada en la lista, si la hay (no se pide aparte). */
  firstOverdue: { title: string | null; contact: string | null } | null;
}): TasksNextUp {
  const { stats } = input;

  if (input.agentMode) {
    const counts = input.digest?.counts ?? null;
    const window = input.digest?.window === "yesterday" ? "yesterday" : "today";
    const failed = counts?.failed ?? stats.agent.failed;
    const figures = counts === null ? [] : agentDigestFigures(counts);
    const [first, ...rest] = figures;
    const failedText = failed > 0 ? `${failed} no se ${plural(failed, "pudo", "pudieron")} enviar.` : "";
    if (first === undefined) {
      return {
        kind: "agent",
        title: failed > 0 ? `${failed} sin enviar` : "Sin movimiento todavía",
        detail:
          failed > 0
            ? "Revisa el motivo y reinténtalo: el resto sigue su curso."
            : `${stats.agent.open} ${plural(stats.agent.open, "seguimiento programado", "seguimientos programados")}; aquí verás lo que salga.`,
        failed,
        window,
      };
    }
    const tail = rest.map((figure) => `${figure.value} ${figure.label}`);
    return {
      kind: "agent",
      title: `${first.value} ${first.label}`,
      detail: [tail.length > 0 ? `Además: ${tail.join(" · ")}.` : "", failedText].filter(Boolean).join(" ") || "Todo lo programado salió.",
      failed,
      window,
    };
  }

  if (stats.overdue > 0) {
    const first = input.firstOverdue;
    const who = first?.contact ? ` con ${first.contact}` : "";
    return {
      kind: "overdue",
      count: stats.overdue,
      title: `${stats.overdue} ${plural(stats.overdue, "vencida", "vencidas")}`,
      detail: first?.title ? `La primera: ${first.title}${who}.` : "Tenían fecha y siguen abiertas.",
    };
  }
  if (stats.due_today > 0) {
    return {
      kind: "today",
      count: stats.due_today,
      title: `${stats.due_today} para hoy`,
      detail: "Nada vencido: lo de hoy todavía está a tiempo.",
    };
  }
  return { kind: "clear", title: "Todo al día", detail: "Nada vencido ni pendiente para hoy." };
}
