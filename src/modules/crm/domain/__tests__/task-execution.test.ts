import type { ActivityDTO } from "../activity";
import { isOverdue } from "../activity";
import {
  canRunNow,
  isAgentTask,
  TASK_BADGE_KEY,
  taskBadgeMap,
  taskDisplayState,
  taskRunReasonLabel,
} from "../task-execution";

type TaskShape = Pick<
  ActivityDTO,
  "kind" | "assignee_type" | "task_status" | "last_run_status" | "last_run_reason" | "due_at"
>;

function task(overrides: Partial<TaskShape> = {}): TaskShape {
  return {
    kind: "task",
    assignee_type: "user",
    task_status: "open",
    last_run_status: null,
    last_run_reason: null,
    due_at: "2026-09-01T10:00:00.000Z",
    ...overrides,
  };
}

const AYER = new Date("2026-08-31T12:00:00.000Z");
const VENCIDA = "2026-08-30T10:00:00.000Z";

describe("isAgentTask", () => {
  it("solo una kind=task con assignee_type=agent lo es", () => {
    expect(isAgentTask(task({ assignee_type: "agent" }))).toBe(true);
    expect(isAgentTask(task({ assignee_type: "user" }))).toBe(false);
    // note/call/meeting traen assignee_type null: nunca son de agente.
    expect(isAgentTask(task({ kind: "note", assignee_type: null }))).toBe(false);
  });
});

describe("taskDisplayState — tabla de verdad task_status × last_run_status", () => {
  it("tarea humana abierta: sin badge y CON checkbox", () => {
    const state = taskDisplayState(task());
    expect(state.label).toBeNull();
    expect(state.completable).toBe(true);
  });

  it("tarea humana completada: sin checkbox", () => {
    expect(taskDisplayState(task({ task_status: "completed" })).completable).toBe(false);
  });

  it("tarea de agente: NUNCA lleva checkbox, la cierra el agente", () => {
    for (const status of ["open", "completed", "cancelled"] as const) {
      expect(
        taskDisplayState(task({ assignee_type: "agent", task_status: status })).completable,
      ).toBe(false);
    }
  });

  it("de agente sin intentos: «Programada» en tono info", () => {
    const state = taskDisplayState(task({ assignee_type: "agent" }));
    expect(state.label).toBe("Programada");
    expect(state.tone).toBe("info");
    expect(state.transient).toBe(false);
  });

  it("ejecutando: tono info y transient (spinner DENTRO del badge)", () => {
    const state = taskDisplayState(
      task({ assignee_type: "agent", last_run_status: "running" }),
    );
    expect(state.tone).toBe("info");
    expect(state.transient).toBe(true);
  });

  it("diferida: tono INFO, nunca warning ni destructive", () => {
    // Es la decisión de diseño más importante de la vista: un tenant que vea
    // rojo cada vez que WhatsApp cierra su ventana apaga la automatización.
    const state = taskDisplayState(
      task({
        assignee_type: "agent",
        last_run_status: "deferred",
        last_run_reason: "outside_service_window",
      }),
    );
    expect(state.label).toBe("En espera");
    expect(state.tone).toBe("info");
    expect(state.reason).toBe("Fuera de la ventana de 24 h de WhatsApp");
  });

  it("fallida: destructive y con la razón legible", () => {
    const state = taskDisplayState(
      task({ assignee_type: "agent", last_run_status: "failed", last_run_reason: "no_channel" }),
    );
    expect(state.tone).toBe("destructive");
    expect(state.reason).toBe("El contacto no tiene ningún canal alcanzable");
  });

  it("task_status GOBIERNA: una cancelada no promete un reintento", () => {
    // Sin esta regla, la fila diría «En espera» sobre una tarea que ya no va a
    // intentarlo nunca más.
    const state = taskDisplayState(
      task({
        assignee_type: "agent",
        task_status: "cancelled",
        last_run_status: "deferred",
        last_run_reason: "quiet_hours",
      }),
    );
    expect(state.label).toBe("Cancelada");
    expect(state.tone).toBe("neutral");
  });

  it("cancelada por expiración se pinta como fallo, no como decisión humana", () => {
    const state = taskDisplayState(
      task({
        assignee_type: "agent",
        task_status: "cancelled",
        last_run_status: "failed",
        last_run_reason: "expired",
      }),
    );
    expect(state.label).toBe("No se pudo enviar");
    expect(state.tone).toBe("destructive");
    expect(state.reason).toBe("Se agotaron los intentos");
  });

  it("completada: éxito, sin arrastrar la razón del último intento", () => {
    const state = taskDisplayState(
      task({
        assignee_type: "agent",
        task_status: "completed",
        last_run_status: "done",
        last_run_reason: "outside_service_window",
      }),
    );
    expect(state.label).toBe("Enviada");
    expect(state.tone).toBe("success");
    expect(state.reason).toBeNull();
  });
});

describe("taskRunReasonLabel", () => {
  it("traduce lo que conoce", () => {
    expect(taskRunReasonLabel("quiet_hours")).toBe("Fuera del horario permitido para escribir");
  });

  it("una razón nueva del backend se muestra CRUDA, no en blanco", () => {
    // El catálogo es string libre en el backend justamente para poder crecer sin
    // migración: la vista no puede quedarse muda ante un valor que no conoce.
    expect(taskRunReasonLabel("razon_inventada_del_futuro")).toBe("razon_inventada_del_futuro");
  });

  it("null y vacío no producen texto", () => {
    expect(taskRunReasonLabel(null)).toBeNull();
    expect(taskRunReasonLabel("")).toBeNull();
  });
});

describe("isOverdue", () => {
  it("una tarea humana abierta y pasada de fecha está vencida", () => {
    expect(isOverdue(task({ due_at: VENCIDA }), AYER)).toBe(true);
  });

  it("una tarea de agente EN ESPERA no está vencida", () => {
    // El rojo de vencimiento significa «alguien no hizo algo»; un diferimiento
    // es el motor esperando su ventana.
    expect(
      isOverdue(
        task({ assignee_type: "agent", last_run_status: "deferred", due_at: VENCIDA }),
        AYER,
      ),
    ).toBe(false);
  });

  it("una tarea de agente FALLIDA y pasada de fecha sí está vencida", () => {
    expect(
      isOverdue(
        task({ assignee_type: "agent", last_run_status: "failed", due_at: VENCIDA }),
        AYER,
      ),
    ).toBe(true);
  });

  it("una cerrada nunca está vencida", () => {
    expect(isOverdue(task({ task_status: "completed", due_at: VENCIDA }), AYER)).toBe(false);
  });
});

describe("canRunNow", () => {
  it("abierta y no corriendo: se puede lanzar a mano", () => {
    expect(canRunNow(task({ assignee_type: "agent" }))).toBe(true);
    expect(canRunNow(task({ assignee_type: "agent", last_run_status: "deferred" }))).toBe(true);
    expect(canRunNow(task({ assignee_type: "agent", last_run_status: "failed" }))).toBe(true);
  });

  it("corriendo, cerrada o humana: no", () => {
    expect(canRunNow(task({ assignee_type: "agent", last_run_status: "running" }))).toBe(false);
    expect(canRunNow(task({ assignee_type: "agent", task_status: "completed" }))).toBe(false);
    expect(canRunNow(task())).toBe(false);
  });
});

describe("taskBadgeMap", () => {
  it("transporta la decisión de taskDisplayState al contrato de StatusBadge", () => {
    const state = taskDisplayState(task({ assignee_type: "agent", last_run_status: "running" }));

    expect(taskBadgeMap(state)[TASK_BADGE_KEY]).toEqual({
      label: "Enviando",
      tone: "info",
      transient: true,
    });
  });

  it("un diferimiento NO viaja con spinner ni con tono de fallo", () => {
    // El spinner promete movimiento; una tarea en espera no se está moviendo.
    const state = taskDisplayState(
      task({
        assignee_type: "agent",
        last_run_status: "deferred",
        last_run_reason: "outside_service_window",
      }),
    );

    expect(taskBadgeMap(state)[TASK_BADGE_KEY]).toMatchObject({ tone: "info", transient: false });
  });
});
