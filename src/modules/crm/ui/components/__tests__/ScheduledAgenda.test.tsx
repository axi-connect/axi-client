import { fireEvent, render, screen, within } from "@testing-library/react";
import { ScheduledAgenda } from "../ScheduledAgenda";
import type { ActivityDTO } from "@/modules/crm/domain/activity";

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
    opening_template: { channel_template_id: "tpl", channel_id: "ch", name: "sesion_en_vivo_v2", language: "es_CO", params: [], topic: null },
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
  },
});

const WAITING = ["Alejandro", "Mónica"].map((name, index) =>
  task({
    id: `w${String(index)}`,
    contact_name: name,
    awaiting_reply_until: "2026-10-01T21:08:00Z",
    next_run_at: "2026-10-01T21:08:00Z",
    last_opening: {
      run_id: `r${String(index)}`,
      message_id: `m${String(index)}`,
      conversation_id: `conv${String(index)}`,
      sent_at: "2026-09-29T21:08:00Z",
      delivery_status: index === 0 ? "read" : "delivered",
      delivery_updated_at: "2026-09-29T21:09:00Z",
      failed_reason: null,
      failed_detail: null,
    },
  }),
);

function renderAgenda(onResend = jest.fn(async () => {})) {
  render(
    <ScheduledAgenda
      tasks={[REJECTED, ...WAITING]}
      loading={false}
      tz="America/Bogota"
      agentNames={new Map([["ag1", "Laura Sofía"]])}
      quietHours={null}
      onInspect={jest.fn()}
      onResend={onResend}
    />,
  );
  return onResend;
}

describe("ScheduledAgenda — a quién, con qué y cómo va (hotfix plantillas)", () => {
  it("«No llegaron» dice a quién, por qué, y «Reenviar» llama al reenvío", () => {
    const onResend = renderAgenda();
    const failed = screen.getByRole("region", { name: "No llegaron" });

    expect(within(failed).getByText("Cristian")).toBeInTheDocument();
    expect(within(failed).getByText(/Meta no cobró el envío/)).toBeInTheDocument();
    expect(within(failed).getByText(/Plantilla «sesion_en_vivo_v2»/)).toBeInTheDocument();
    expect(within(failed).getByRole("link", { name: "Ver en el chat" })).toHaveAttribute("href", "/workspace/inbox/conv1");

    fireEvent.click(within(failed).getByRole("button", { name: /Reenviar/ }));
    expect(onResend).toHaveBeenCalledWith(REJECTED);
  });

  it("«Esperando respuesta» agrupa el lote: el título una vez, cada contacto con su entrega", () => {
    renderAgenda();
    const waiting = screen.getByRole("region", { name: "Esperando respuesta" });

    expect(within(waiting).getAllByText("Cerrar una agenda para la sesión de configuraciones")).toHaveLength(1);
    expect(within(waiting).getByText(/Seguimiento en lote · Laura Sofía · abre con «sesion_en_vivo_v2»/)).toBeInTheDocument();
    expect(within(waiting).getByText("Alejandro")).toBeInTheDocument();
    expect(within(waiting).getByText(/^Leída · /)).toBeInTheDocument();
    expect(within(waiting).getByText(/^Entregada · /)).toBeInTheDocument();
    // Lo que espera NO se reenvía: solo lo que no llegó
    expect(within(waiting).queryByRole("button", { name: /Reenviar/ })).not.toBeInTheDocument();
  });

  it("sin fallos no aparece la sección «No llegaron»", () => {
    render(
      <ScheduledAgenda
        tasks={WAITING}
        loading={false}
        tz="America/Bogota"
        agentNames={new Map()}
        quietHours={null}
        onInspect={jest.fn()}
        onResend={jest.fn(async () => {})}
      />,
    );
    expect(screen.queryByRole("region", { name: "No llegaron" })).not.toBeInTheDocument();
  });
});
