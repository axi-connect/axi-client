import type { ActivityDTO } from "@/modules/crm/domain/activity";
import {
  activityFormSchema,
  buildActivityFormFields,
  defaultActivityFormValues,
  editActivityFormValues,
  toCreateActivityDTO,
  toCreateAgentTaskDTO,
  toUpdateAgentTaskDTO,
  type ActivityFormValues,
} from "../activity.config";

const AGENT = { id: "agent-1", name: "Aria", status: "active" as const };

function values(overrides: Partial<ActivityFormValues> = {}): ActivityFormValues {
  return {
    ...defaultActivityFormValues({ contact: { id: "contact-1", label: "Ana" } }),
    ...overrides,
  };
}

function errorsFor(input: ActivityFormValues): string[] {
  const result = activityFormSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
}

describe("activity.config — ramal de agente", () => {
  it("por defecto la ejecuta una persona", () => {
    // Que la IA le escriba a un cliente es una decisión, nunca un default.
    expect(defaultActivityFormValues().executor).toBe("user");
  });

  it("una tarea de agente sin objetivo ni agente no pasa la validación", () => {
    expect(errorsFor(values({ executor: "agent", due_at: "2026-09-02T10:00" }))).toEqual(
      expect.arrayContaining(["assigned_agent_id", "objective"]),
    );
  });

  it("un objetivo de tres palabras se rechaza: produce un mensaje genérico", () => {
    expect(
      errorsFor(
        values({
          executor: "agent",
          due_at: "2026-09-02T10:00",
          assigned_agent_id: AGENT.id,
          objective: "llamar ya",
        }),
      ),
    ).toContain("objective");
  });

  it("una tarea HUMANA no exige objetivo aunque el campo esté vacío", () => {
    // El ramal de IA no puede contaminar la validación del camino de siempre.
    expect(errorsFor(values({ title: "Llamar", due_at: "2026-09-02T10:00" }))).toEqual([]);
  });

  it("una nota no exige ni fecha ni nada del ramal de IA", () => {
    expect(errorsFor(values({ kind: "note", title: "Nota" }))).toEqual([]);
  });

  it("el título sigue siendo obligatorio donde SÍ se pinta", () => {
    expect(errorsFor(values({ title: "", due_at: "2026-09-02T10:00" }))).toContain("title");
  });

  it("el ramal de IA NO exige título: el campo ni siquiera se pinta", () => {
    // Exigirlo bloquearía el guardado con un error sin dónde mostrarse.
    expect(
      errorsFor(
        values({
          title: "",
          executor: "agent",
          assigned_agent_id: AGENT.id,
          objective: "Retomar la cotización del plan anual",
          due_at: "2026-09-02T10:00",
        }),
      ),
    ).toEqual([]);
  });

  it("el DTO de agente NO manda título: lo deriva el backend del objetivo", () => {
    const dto = toCreateAgentTaskDTO(
      values({
        executor: "agent",
        assigned_agent_id: AGENT.id,
        objective: "  Retomar la cotización del plan anual  ",
        due_at: "2026-09-02T10:00",
      }),
    );

    expect(dto).toMatchObject({
      contact_id: "contact-1",
      assigned_agent_id: AGENT.id,
      objective: "Retomar la cotización del plan anual",
    });
    expect("title" in dto).toBe(false);
  });

  it("el DTO humano sigue sin campos de agente", () => {
    const dto = toCreateActivityDTO(values({ title: "Llamar", due_at: "2026-09-02T10:00" }));

    expect("objective" in dto).toBe(false);
    expect("assigned_agent_id" in dto).toBe(false);
  });
});

describe("activity.config — campos visibles", () => {
  function visibleNames(input: ActivityFormValues, agents: typeof AGENT[]) {
    return buildActivityFormFields({ users: [], agents, contactLocked: false })
      .filter((field) => field.isVisible?.(input) ?? true)
      .map((field) => String(field.name));
  }

  it("en el ramal de IA no se piden título, detalle ni asignado", () => {
    const names = visibleNames(values({ executor: "agent" }), [AGENT]);

    expect(names).toContain("objective");
    expect(names).toContain("assigned_agent_id");
    expect(names).not.toContain("title");
    expect(names).not.toContain("body");
    expect(names).not.toContain("assigned_user_id");
  });

  it("la tarea humana no ve nada del ramal de IA", () => {
    const names = visibleNames(values(), [AGENT]);

    expect(names).toContain("title");
    expect(names).toContain("assigned_user_id");
    expect(names).not.toContain("objective");
  });

  it("`due_at` se declara dos veces pero solo una está visible a la vez", () => {
    // Son dos lecturas distintas —vencimiento vs. momento de ejecución— y el
    // DynamicForm admite variantes del mismo `name`; lo que no puede pasar es
    // que se pinten las dos.
    const fields = buildActivityFormFields({ users: [], agents: [AGENT], contactLocked: false });
    const dueFields = fields.filter((field) => field.name === "due_at");

    expect(dueFields).toHaveLength(2);
    for (const input of [values(), values({ executor: "agent" })]) {
      expect(dueFields.filter((field) => field.isVisible?.(input) ?? true)).toHaveLength(1);
    }
  });

  it("sin agentes activos el ramal de IA no se ofrece", () => {
    const executor = buildActivityFormFields({
      users: [],
      agents: [],
      contactLocked: false,
    }).find((field) => field.name === "executor");

    expect(executor?.description).toContain("Activa un agente");
  });
});

describe("activity.config — edición", () => {
  const TASK = {
    id: "task-1",
    contact_id: "contact-1",
    kind: "task",
    title: "Retomar cotización",
    body: null,
    assignee_type: "agent",
    assigned_agent_id: AGENT.id,
    assigned_user_id: null,
    objective: "Recordarle que su cotización vence mañana",
    due_at: "2026-09-02T15:00:00.000Z",
  } as ActivityDTO;

  it("precarga el ramal de IA con su objetivo y su agente", () => {
    const preloaded = editActivityFormValues(TASK);

    expect(preloaded).toMatchObject({
      executor: "agent",
      assigned_agent_id: AGENT.id,
      objective: "Recordarle que su cotización vence mañana",
    });
  });

  it("la fecha llega en el formato que acepta datetime-local, no en ISO", () => {
    // Un ISO con zona deja el input VACÍO y la fecha se perdería al guardar.
    expect(editActivityFormValues(TASK).due_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("una tarea sin fecha no rompe la precarga", () => {
    expect(editActivityFormValues({ ...TASK, due_at: null }).due_at).toBe("");
  });

  it("el PATCH de agente manda los tres campos que reinician los intentos", () => {
    expect(
      toUpdateAgentTaskDTO(
        values({
          executor: "agent",
          assigned_agent_id: AGENT.id,
          objective: "Nuevo objetivo con detalle",
          due_at: "2026-09-03T09:00",
        }),
      ),
    ).toMatchObject({ objective: "Nuevo objetivo con detalle", assigned_agent_id: AGENT.id });
  });
});
