import type { ActivityDTO } from "@/modules/crm/domain/activity";
import {
  availableMedia,
  editScheduleFollowUpValues,
  toCreateFollowUpDTO,
  toUpdateFollowUpDTO,
  type ScheduleFollowUpValues,
} from "../schedule-follow-up.config";

const TZ = "America/Bogota";

function values(over: Partial<ScheduleFollowUpValues> = {}): ScheduleFollowUpValues {
  return {
    contact: { id: "ct-1", label: "Ana" },
    agent_id: "ag-1",
    medium: "message",
    objective: "Retomar la cotización del plan anual",
    date: "2026-09-18",
    time: "09:00",
    opening_template_id: "__none__",
    topic: "",
    ...over,
  };
}

describe("schedule-follow-up.config — medios (F3)", () => {
  it("sin la capacidad `calls` del plan, solo se ofrece mensaje", () => {
    expect(availableMedia(false)).toEqual(["message"]);
  });

  it("con la capacidad, los tres medios de D3", () => {
    expect(availableMedia(true)).toEqual(["message", "call", "call_then_message"]);
  });

  it("el medio elegido viaja como task_channel al crear y al editar", () => {
    const create = toCreateFollowUpDTO(values({ medium: "call_then_message" }), {
      tz: TZ,
      template: undefined,
    });
    expect(create.task_channel).toBe("call_then_message");

    const update = toUpdateFollowUpDTO(values({ medium: "call" }), { tz: TZ, template: undefined });
    expect(update.task_channel).toBe("call");
  });

  it("al editar se parte de la POLÍTICA, no del medio en curso", () => {
    // Una «llamar, y si no, escribir» que ya pasó a mensaje sigue siendo esa
    // política: mostrar «mensaje» la degradaría en silencio al guardar.
    const task = {
      id: "act-1",
      contact_id: "ct-1",
      due_at: "2026-09-18T14:00:00.000Z",
      assigned_agent_id: "ag-1",
      objective: "Retomar la cotización",
      opening_template: null,
      task_channel: "call_then_message",
      task_medium: "message",
    } as unknown as ActivityDTO;

    expect(editScheduleFollowUpValues(task, TZ).medium).toBe("call_then_message");
  });

  it("una tarea anterior a F3 (sin task_channel) se edita como mensaje", () => {
    const task = {
      id: "act-1",
      contact_id: "ct-1",
      due_at: "2026-09-18T14:00:00.000Z",
      assigned_agent_id: "ag-1",
      objective: "Retomar la cotización",
      opening_template: null,
      task_channel: null,
      task_medium: null,
    } as unknown as ActivityDTO;

    expect(editScheduleFollowUpValues(task, TZ).medium).toBe("message");
  });
});
