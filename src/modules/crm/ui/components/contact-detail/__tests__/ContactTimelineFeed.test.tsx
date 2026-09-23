import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { CursorPage } from "@/core/api/types";
import type { TimelineEntryDTO } from "@/modules/crm/domain/contact";
import { ContactTimelineFeed } from "../ContactTimelineFeed";

jest.mock("@/modules/crm/infrastructure/services/contacts-service.adapter", () => ({
  getContactTimeline: jest.fn(),
}));

const revertStageChange = jest.fn();
jest.mock("@/modules/crm/infrastructure/services/journey-service.adapter", () => ({
  revertStageChange: (...args: unknown[]) => revertStageChange(...args),
}));

type ModalAction = { label: string; onClick?: () => void };
let lastModal: { title?: string; actions?: ModalAction[] } | null = null;
const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({
    showAlert,
    closeModal: jest.fn(),
    showModal: (config: { title?: string; actions?: ModalAction[] }) => {
      lastModal = config;
    },
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getContactTimeline } = require("@/modules/crm/infrastructure/services/contacts-service.adapter") as {
  getContactTimeline: jest.Mock;
};

function entry(overrides: Partial<TimelineEntryDTO> = {}): TimelineEntryDTO {
  return {
    id: "e1",
    source: "orders",
    type: "order_status_changed",
    occurred_at: new Date().toISOString(),
    title: "Pedido #1",
    subtitle: "Entregado",
    payload: {},
    ...overrides,
  } as TimelineEntryDTO;
}

function page(data: TimelineEntryDTO[], nextCursor?: string): CursorPage<TimelineEntryDTO> {
  return { data, next_cursor: nextCursor } as CursorPage<TimelineEntryDTO>;
}

beforeEach(() => {
  getContactTimeline.mockReset();
  revertStageChange.mockReset();
  showAlert.mockReset();
  lastModal = null;
});

/** Un `stage_changed` tal como lo emite `GET /crm/contacts/:id/timeline` (F4). */
function stageChanged(payload: Record<string, unknown> = {}, id = "ev1"): TimelineEntryDTO {
  return entry({
    id,
    source: "deals",
    type: "deal_stage_changed",
    title: "Oportunidad · Plan facial",
    subtitle: "Cita → Propuesta",
    payload: {
      deal_id: "d1",
      event_id: id,
      actor_type: "system",
      from_kind: "meeting",
      to_kind: "proposal",
      from_stage_name: "Cita agendada",
      to_stage_name: "Propuesta",
      ...payload,
    },
  });
}

describe("ContactTimelineFeed", () => {
  it("compone entidad — novedad y la línea de fuente", async () => {
    getContactTimeline.mockResolvedValue(page([entry()]));
    render(<ContactTimelineFeed contactId="c1" />);

    expect(await screen.findByText("Pedido #1")).toBeInTheDocument();
    expect(screen.getByText("— Entregado")).toBeInTheDocument();
    expect(screen.getByText(/^Pedidos ·/)).toBeInTheDocument();
  });

  it("cae al label de la fuente si el backend no manda title", async () => {
    getContactTimeline.mockResolvedValue(page([entry({ title: null, subtitle: "Iniciada", source: "conversations" })]));
    render(<ContactTimelineFeed contactId="c1" />);

    expect(await screen.findByText("Conversaciones")).toBeInTheDocument();
  });

  it("marca con badge IA las entradas del agente", async () => {
    getContactTimeline.mockResolvedValue(
      page([
        entry({ id: "a", payload: { actor_type: "ai_agent" } }),
        entry({ id: "b", payload: { created_by_type: "user" } }),
      ]),
    );
    render(<ContactTimelineFeed contactId="c1" />);

    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(2));
    // Solo la entrada del agente lleva el chip; la del operador humano no.
    expect(screen.getAllByText("IA")).toHaveLength(1);
  });

  it("pide todas las fuentes al montar y quita la que se desactiva", async () => {
    getContactTimeline.mockResolvedValue(page([]));
    render(<ContactTimelineFeed contactId="c1" />);

    await waitFor(() => expect(getContactTimeline).toHaveBeenCalledTimes(1));
    expect(getContactTimeline.mock.calls[0][1].sources).toEqual([
      "activities",
      "deals",
      "orders",
      "conversations",
      "appointments",
      "lifecycle",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Pedidos" }));
    await waitFor(() => expect(getContactTimeline).toHaveBeenCalledTimes(2));
    expect(getContactTimeline.mock.calls[1][1].sources).not.toContain("orders");
  });

  it("nunca deja las seis fuentes desactivadas", async () => {
    getContactTimeline.mockResolvedValue(page([]));
    render(<ContactTimelineFeed contactId="c1" />);
    await waitFor(() => expect(getContactTimeline).toHaveBeenCalled());

    for (const label of ["Actividades", "Oportunidades", "Pedidos", "Conversaciones", "Citas", "Ciclo de vida"]) {
      fireEvent.click(screen.getByRole("button", { name: label }));
    }

    await waitFor(() => {
      const last = getContactTimeline.mock.calls.at(-1)?.[1].sources as string[];
      expect(last.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("pagina con el cursor opaco y acumula entradas", async () => {
    getContactTimeline
      .mockResolvedValueOnce(page([entry({ id: "e1", title: "Pedido #1" })], "2026-07-01T00:00:00Z_e1"))
      .mockResolvedValueOnce(page([entry({ id: "e2", title: "Pedido #2" })]));

    render(<ContactTimelineFeed contactId="c1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Cargar más" }));

    expect(await screen.findByText("Pedido #2")).toBeInTheDocument();
    expect(screen.getByText("Pedido #1")).toBeInTheDocument();
    expect(getContactTimeline.mock.calls[1][1].cursor).toBe("2026-07-01T00:00:00Z_e1");
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Cargar más" })).not.toBeInTheDocument(),
    );
  });

  it("re-consulta desde la primera página al cambiar version (evento WS)", async () => {
    getContactTimeline.mockResolvedValue(page([entry()]));
    const { rerender } = render(<ContactTimelineFeed contactId="c1" version={0} />);
    await waitFor(() => expect(getContactTimeline).toHaveBeenCalledTimes(1));

    rerender(<ContactTimelineFeed contactId="c1" version={1} />);
    await waitFor(() => expect(getContactTimeline).toHaveBeenCalledTimes(2));
    expect(getContactTimeline.mock.calls[1][1].cursor).toBeUndefined();
  });

  it("muestra error con reintento cuando falla la consulta", async () => {
    getContactTimeline.mockRejectedValue(new Error("boom"));
    render(<ContactTimelineFeed contactId="c1" />);

    expect(await screen.findByRole("button", { name: "Reintentar" })).toBeInTheDocument();

    getContactTimeline.mockResolvedValue(page([entry()]));
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Pedido #1")).toBeInTheDocument();
  });

  it("estado vacío explícito cuando no hay eventos", async () => {
    getContactTimeline.mockResolvedValue(page([]));
    render(<ContactTimelineFeed contactId="c1" />);

    expect(
      await screen.findByText("Sin eventos para las fuentes seleccionadas."),
    ).toBeInTheDocument();
  });
});

describe("ContactTimelineFeed — recorrido (F4)", () => {
  it("un paso movido por la IA se cuenta con la razón, en violeta y con el chip IA", async () => {
    getContactTimeline.mockResolvedValue(
      page([stageChanged({ actor_type: "ai_agent", reason: "Pidió la cotización" })]),
    );
    const { container } = render(<ContactTimelineFeed contactId="c1" />);

    expect(await screen.findByText("Pasó a Propuesta")).toBeInTheDocument();
    expect(screen.getByText(/agente IA · «Pidió la cotización»/)).toBeInTheDocument();
    expect(screen.getByText("IA")).toBeInTheDocument();
    expect(container.querySelector(".bg-accent-violet\\/12")).not.toBeNull();
  });

  it("un paso por regla se cuenta neutro con el nombre de la regla", async () => {
    getContactTimeline.mockResolvedValue(
      page([stageChanged({ actor_type: "system", rule_code: "appointment_booked", to_stage_name: "Cita agendada" })]),
    );
    const { container } = render(<ContactTimelineFeed contactId="c1" />);

    expect(await screen.findByText("Pasó a Cita agendada")).toBeInTheDocument();
    expect(screen.getByText(/regla: cita agendada/)).toBeInTheDocument();
    expect(container.querySelector(".bg-accent-violet\\/12")).toBeNull();
    expect(screen.queryByText("IA")).not.toBeInTheDocument();
  });

  it("sin nombre de etapa cae al tipo; un paso deshecho y un cambio de ciclo de vida tienen su frase", async () => {
    getContactTimeline.mockResolvedValue(
      page([
        stageChanged({ to_stage_name: undefined }, "a"),
        entry({
          id: "b",
          source: "deals",
          type: "deal_stage_reverted",
          title: "Oportunidad · Plan facial",
          payload: { deal_id: "d1", reverted_event_id: "a", from_stage_name: "Propuesta", to_stage_name: "Cita agendada" },
        }),
        entry({
          id: "c",
          source: "lifecycle",
          type: "lifecycle_changed",
          title: "Ciclo de vida",
          payload: { from_stage: "prospect", to_stage: "lead", source_event: "order.created", reason: null },
        }),
      ]),
    );
    render(<ContactTimelineFeed contactId="c1" />);

    expect(await screen.findByText("Pasó a Propuesta")).toBeInTheDocument();
    expect(screen.getByText("Se deshizo el paso a Propuesta")).toBeInTheDocument();
    expect(screen.getByText("Prospecto → Lead")).toBeInTheDocument();
    expect(screen.getByText("(pedido creado)")).toBeInTheDocument();
    expect(screen.getByText(/^Ciclo de vida ·/)).toBeInTheDocument();
  });

  it("«Deshacer» solo con permiso, solo en cambios de etapa y nunca en uno ya deshecho", async () => {
    const entries = [
      stageChanged({}, "fresh"),
      stageChanged({}, "undone"),
      entry({
        id: "rev",
        source: "deals",
        type: "deal_stage_reverted",
        title: "Oportunidad · Plan facial",
        payload: { deal_id: "d1", reverted_event_id: "undone", from_stage_name: "Propuesta" },
      }),
      entry({ id: "o", source: "orders", title: "Pedido #1" }),
    ];
    getContactTimeline.mockResolvedValue(page(entries));
    const { unmount } = render(<ContactTimelineFeed contactId="c1" />);
    await screen.findByText("Pedido #1");
    expect(screen.queryByRole("button", { name: "Deshacer" })).not.toBeInTheDocument();
    unmount();

    getContactTimeline.mockResolvedValue(page(entries));
    render(<ContactTimelineFeed contactId="c1" canRevert />);
    await screen.findByText("Pedido #1");
    expect(screen.getAllByRole("button", { name: "Deshacer" })).toHaveLength(1);
  });

  it("deshacer confirma en un modal, llama al servidor y avisa al resto de la ficha", async () => {
    getContactTimeline.mockResolvedValue(
      page([stageChanged({ actor_type: "ai_agent", reason: "Pidió cotización" })]),
    );
    revertStageChange.mockResolvedValue(undefined);
    const changed = jest.fn();
    window.addEventListener("crm:journey:changed", changed);
    render(<ContactTimelineFeed contactId="c1" canRevert />);

    fireEvent.click(await screen.findByRole("button", { name: "Deshacer" }));
    expect(lastModal?.title).toBe("¿Deshacer el paso a Propuesta?");
    lastModal?.actions?.find((action) => action.label === "Deshacer")?.onClick?.();

    await waitFor(() => expect(revertStageChange).toHaveBeenCalledWith("d1", "ev1"));
    await waitFor(() => expect(changed).toHaveBeenCalled());
    // El aviso recarga el historial desde la primera página.
    await waitFor(() => expect(getContactTimeline.mock.calls.length).toBeGreaterThanOrEqual(2));
    window.removeEventListener("crm:journey:changed", changed);
  });
});
