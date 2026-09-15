import type { ActivityDTO } from "@/modules/crm/domain/activity";
import {
  bucketDateLabel,
  bucketMixesDays,
  clockLabel,
  dayLabel,
  effectiveWhen,
  groupTasks,
  isPastSlot,
  taskBucket,
} from "@/modules/crm/domain/task-grouping";

const TZ = "America/Bogota";
/** jueves 18 de septiembre de 2026, 11:20 en Bogotá. */
const NOW = new Date("2026-09-18T16:20:00Z");

function task(over: Partial<ActivityDTO>): ActivityDTO {
  return {
    id: "t",
    kind: "task",
    assignee_type: "user",
    task_status: "open",
    due_at: null,
    next_run_at: null,
    last_run_status: null,
    ...over,
  } as ActivityDTO;
}

const agent = (over: Partial<ActivityDTO>) => task({ assignee_type: "agent", ...over });

describe("effectiveWhen", () => {
  it("una tarea de agente ABIERTA se describe por next_run_at, no por due_at", () => {
    // Con los diferimientos el compromiso y la cita real dejan de coincidir, y
    // lo que el operador necesita saber es cuándo lo va a intentar la IA.
    const t = agent({ due_at: "2026-09-18T14:00:00Z", next_run_at: "2026-09-19T14:00:00Z" });
    expect(effectiveWhen(t)).toBe("2026-09-19T14:00:00Z");
  });

  it("cerrada ya no hay próxima cita: manda el compromiso", () => {
    const t = agent({
      task_status: "completed",
      due_at: "2026-09-18T14:00:00Z",
      next_run_at: "2026-09-19T14:00:00Z",
    });
    expect(effectiveWhen(t)).toBe("2026-09-18T14:00:00Z");
  });

  it("una tarea humana no tiene cita del motor", () => {
    expect(effectiveWhen(task({ due_at: "2026-09-18T14:00:00Z" }))).toBe("2026-09-18T14:00:00Z");
  });
});

describe("taskBucket", () => {
  it("vencida de verdad → Vencidas", () => {
    expect(taskBucket(task({ due_at: "2026-09-16T22:00:00Z" }), TZ, NOW)).toBe("overdue");
  });

  it("una de agente EN ESPERA no es una tarea vencida", () => {
    // Su due_at ya pasó, pero el motor la reintenta esta noche: pintarla en el
    // grupo rojo convertiría la operación normal en alarma.
    const t = agent({
      due_at: "2026-09-17T14:00:00Z",
      next_run_at: "2026-09-19T01:00:00Z",
      last_run_status: "deferred",
    });
    expect(taskBucket(t, TZ, NOW)).toBe("today");
  });

  it("corta el día en la zona del NEGOCIO, no en UTC", () => {
    // 2026-09-19T02:00Z son las 21:00 del jueves en Bogotá: sigue siendo hoy.
    expect(taskBucket(task({ due_at: "2026-09-19T02:00:00Z" }), TZ, NOW)).toBe("today");
  });

  it("mañana, esta semana y más adelante", () => {
    expect(taskBucket(task({ due_at: "2026-09-19T14:00:00Z" }), TZ, NOW)).toBe("tomorrow");
    expect(taskBucket(task({ due_at: "2026-09-22T14:00:00Z" }), TZ, NOW)).toBe("week");
    expect(taskBucket(task({ due_at: "2026-10-30T14:00:00Z" }), TZ, NOW)).toBe("later");
  });

  it("sin vencimiento no inventa un día", () => {
    expect(taskBucket(task({ due_at: null }), TZ, NOW)).toBe("undated");
  });

  it("una recién completada NO salta de grupo bajo el cursor", () => {
    // `isOverdue` deja de marcarla al cerrarse; sin la rama de días negativos
    // caería en «Hoy» y la fila se movería sola justo al marcarla.
    const t = task({ task_status: "completed", due_at: "2026-09-16T22:00:00Z" });
    expect(taskBucket(t, TZ, NOW)).toBe("overdue");
  });
});

describe("groupTasks", () => {
  it("devuelve solo los cubos con tareas, en orden de lectura", () => {
    const groups = groupTasks(
      [
        task({ id: "manana", due_at: "2026-09-19T14:00:00Z" }),
        task({ id: "vencida", due_at: "2026-09-16T22:00:00Z" }),
        task({ id: "hoy", due_at: "2026-09-18T23:00:00Z" }),
      ],
      TZ,
      NOW,
    );
    expect(groups.map((g) => g.bucket)).toEqual(["overdue", "today", "tomorrow"]);
  });

  it("ordena cada cubo por el instante que la fila PINTA", () => {
    // El servidor pagina por `due_at`; dentro del grupo manda la cita real, o
    // el canalón de horas saldría desordenado.
    const groups = groupTasks(
      [
        agent({ id: "tarde", due_at: "2026-09-18T18:30:00Z", next_run_at: "2026-09-18T23:00:00Z" }),
        task({ id: "pronto", due_at: "2026-09-18T18:00:00Z" }),
      ],
      TZ,
      NOW,
    );
    expect(groups[0]?.tasks.map((t) => t.id)).toEqual(["pronto", "tarde"]);
  });
});

describe("rótulos", () => {
  it("fecha larga en Hoy y Mañana, rango en Esta semana", () => {
    expect(bucketDateLabel("today", TZ, NOW)).toContain("18 de septiembre");
    expect(bucketDateLabel("tomorrow", TZ, NOW)).toContain("19 de septiembre");
    expect(bucketDateLabel("week", TZ, NOW)).toBe("20 sept – 25 sept");
    expect(bucketDateLabel("overdue", TZ, NOW)).toBeNull();
  });

  it("el canalón va en 24 h y en la zona del negocio", () => {
    expect(clockLabel("2026-09-18T23:00:00Z", TZ)).toBe("18:00");
  });

  it("solo los cubos que mezclan días piden fecha en la fila", () => {
    expect(bucketMixesDays("overdue")).toBe(true);
    expect(bucketMixesDays("week")).toBe(true);
    expect(bucketMixesDays("today")).toBe(false);
  });

  it("la fecha de la fila es relativa cuando cae cerca", () => {
    expect(dayLabel("2026-09-18T23:00:00Z", TZ, NOW)).toBeNull();
    expect(dayLabel("2026-09-17T14:00:00Z", TZ, NOW)).toBe("ayer");
    expect(dayLabel("2026-09-22T14:00:00Z", TZ, NOW)).toBe("22 sept");
  });
});

describe("isPastSlot", () => {
  it("abierta y con la hora pasada se atenúa; cerrada no", () => {
    expect(isPastSlot(task({ due_at: "2026-09-18T14:00:00Z" }), NOW)).toBe(true);
    expect(isPastSlot(task({ due_at: "2026-09-18T23:00:00Z" }), NOW)).toBe(false);
    expect(
      isPastSlot(task({ task_status: "completed", due_at: "2026-09-18T14:00:00Z" }), NOW),
    ).toBe(false);
  });
});
