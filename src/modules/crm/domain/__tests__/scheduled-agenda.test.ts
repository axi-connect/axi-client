import type { ActivityDTO } from "@/modules/crm/domain/activity";
import {
  agendaSections,
  failureSentence,
  isOpeningNotDelivered,
  openingDeliveryLabel,
  whenLabel,
} from "@/modules/crm/domain/scheduled-agenda";
import { taskDisplayState } from "@/modules/crm/domain/task-execution";

const TZ = "America/Bogota";
// 2026-09-29 16:20 en Bogotá
const NOW = new Date("2026-09-29T21:20:00Z");
const BULK = "01a0eefb-9d7f-77d0-9839-a901b6988a2a";

function task(overrides: Partial<ActivityDTO> = {}): ActivityDTO {
  return {
    id: "t1",
    contact_id: "c1",
    contact_name: "Cristian",
    contact_phone: "+573015550187",
    deal_id: null,
    conversation_id: null,
    kind: "task",
    title: "Cerrar una agenda para la sesión de configuraciones",
    body: null,
    occurred_at: "2026-09-29T21:04:22Z",
    due_at: "2026-09-29T21:05:00Z",
    assigned_user_id: null,
    task_status: "open",
    completed_at: null,
    completed_by_user_id: null,
    created_by_type: "user",
    created_by_user_id: "u1",
    assignee_type: "agent",
    assigned_agent_id: "ag1",
    objective: "Cerrar una agenda",
    trigger: "manual",
    next_run_at: null,
    last_run_at: "2026-09-29T21:05:01Z",
    last_run_status: "done",
    last_run_reason: null,
    attempt_count: 1,
    opening_template: {
      channel_template_id: "tpl",
      channel_id: "ch",
      name: "sesion_en_vivo_v2",
      language: "es_CO",
      params: [],
      topic: null,
    },
    awaiting_reply_until: null,
    task_channel: "message",
    task_medium: "message",
    bulk_id: BULK,
    last_opening: null,
    created_at: "2026-09-29T21:04:22Z",
    updated_at: "2026-09-29T21:05:12Z",
    ...overrides,
  } as ActivityDTO;
}

const REJECTED = task({
  id: "cristian",
  last_run_status: "failed",
  last_run_reason: "opening_rejected",
  last_opening: {
    run_id: "r1",
    message_id: "m1",
    conversation_id: "conv1",
    sent_at: "2026-09-29T21:05:01Z",
    delivery_status: "failed",
    delivery_updated_at: "2026-09-29T21:05:12Z",
    failed_reason: "opening_rejected",
    failed_detail: "Meta no cobró el envío: revisa el método de pago de tu cuenta de WhatsApp Business",
    retry_at: null,
  },
});

function waiting(id: string, name: string, sent: string, status: "sent" | "delivered" | "read") {
  return task({
    id,
    contact_name: name,
    awaiting_reply_until: "2026-10-01T21:08:00Z",
    next_run_at: "2026-10-01T21:08:00Z",
    last_opening: {
      run_id: `r-${id}`,
      message_id: `m-${id}`,
      conversation_id: `conv-${id}`,
      sent_at: sent,
      delivery_status: status,
      delivery_updated_at: sent,
      failed_reason: null,
      failed_detail: null,
      retry_at: null,
    },
  });
}

describe("agendaSections", () => {
  it("el lote del incidente: 1 no llegó, 2 esperan respuesta juntos, 1 por salir", () => {
    const upcoming = task({ id: "julian", contact_name: "Julián", next_run_at: "2026-09-29T21:14:00Z" });
    const sections = agendaSections(
      [
        upcoming,
        waiting("monica", "Mónica", "2026-09-29T21:11:00Z", "delivered"),
        REJECTED,
        waiting("alejandro", "Alejandro", "2026-09-29T21:08:00Z", "read"),
      ],
      TZ,
    );

    expect(sections.failed.map((t) => t.id)).toEqual(["cristian"]);
    // Un grupo por lote, el título una vez, en el orden en que salieron
    expect(sections.waiting).toHaveLength(1);
    expect(sections.waiting[0]).toMatchObject({ key: BULK, bulk: true, templateName: "sesion_en_vivo_v2" });
    expect(sections.waiting[0].tasks.map((t) => t.id)).toEqual(["alejandro", "monica"]);
    expect(sections.upcoming).toEqual([{ day: "2026-09-29", tasks: [upcoming] }]);
  });

  it("una tarea que espera respuesta ya NO sale en el día en que vence la espera", () => {
    const sections = agendaSections([waiting("a", "A", "2026-09-29T21:08:00Z", "sent")], TZ);
    expect(sections.upcoming).toEqual([]);
  });

  it("una tarea suelta que espera es su propio grupo, sin marca de lote", () => {
    const sections = agendaSections([{ ...waiting("a", "A", "2026-09-29T21:08:00Z", "sent"), bulk_id: null }], TZ);
    expect(sections.waiting[0]).toMatchObject({ key: "task-a", bulk: false });
  });

  it("los dos signos: un fallo de otro tipo (expirada, sin cupo) no va a «No llegaron»", () => {
    expect(isOpeningNotDelivered(REJECTED)).toBe(true);
    expect(isOpeningNotDelivered(task({ last_run_status: "failed", last_run_reason: "expired" }))).toBe(false);
    expect(isOpeningNotDelivered({ ...REJECTED, task_status: "cancelled" })).toBe(false);
  });
});

describe("textos de la fila", () => {
  it("dice la entrega en palabras con su hora", () => {
    expect(openingDeliveryLabel(waiting("a", "A", "2026-09-29T21:09:00Z", "read"), NOW, TZ)).toEqual({
      text: "Leída · 4:09 p. m.",
      read: true,
    });
    expect(openingDeliveryLabel(waiting("a", "A", "2026-09-29T21:11:00Z", "delivered"), NOW, TZ).text).toBe(
      "Entregada · 4:11 p. m.",
    );
    expect(openingDeliveryLabel(waiting("a", "A", "2026-09-29T21:08:00Z", "sent"), NOW, TZ).text).toBe(
      "Enviada · hoy 4:08 p. m.",
    );
  });

  it("una corrida anterior al hotfix sin recibo dice «Enviada» a secas", () => {
    expect(openingDeliveryLabel(task({ last_opening: null }), NOW, TZ).text).toBe("Enviada");
  });

  it("whenLabel habla en días del negocio", () => {
    expect(whenLabel("2026-09-29T21:05:00Z", NOW, TZ)).toBe("hoy 4:05 p. m.");
    expect(whenLabel("2026-09-30T14:00:00Z", NOW, TZ)).toBe("mañana 9:00 a. m.");
    expect(whenLabel("2026-10-01T21:08:00Z", NOW, TZ)).toBe("jue, 1 de oct · 4:08 p. m.");
  });

  it("el motivo del servidor se capitaliza y cierra con punto", () => {
    expect(failureSentence(REJECTED)).toBe(
      "Meta no cobró el envío: revisa el método de pago de tu cuenta de WhatsApp Business.",
    );
    expect(
      failureSentence({
        ...REJECTED,
        last_opening: { ...REJECTED.last_opening!, failed_detail: "el número no pudo recibir el mensaje" },
      }),
    ).toBe("El número no pudo recibir el mensaje.");
    expect(failureSentence({ ...REJECTED, last_opening: null })).toBe("La plantilla de apertura no llegó.");
  });

  it("taskDisplayState dice «No llegó» y no «No se pudo enviar»", () => {
    expect(taskDisplayState(REJECTED)).toMatchObject({ label: "No llegó", tone: "destructive" });
  });
});
