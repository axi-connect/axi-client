import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { CursorPage } from "@/core/api/types";
import type { TimelineEntryDTO } from "@/modules/crm/domain/contact";
import { ContactTimelineFeed } from "../ContactTimelineFeed";

jest.mock("@/modules/crm/infrastructure/services/contacts-service.adapter", () => ({
  getContactTimeline: jest.fn(),
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
});

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
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Pedidos" }));
    await waitFor(() => expect(getContactTimeline).toHaveBeenCalledTimes(2));
    expect(getContactTimeline.mock.calls[1][1].sources).not.toContain("orders");
  });

  it("nunca deja las cinco fuentes desactivadas", async () => {
    getContactTimeline.mockResolvedValue(page([]));
    render(<ContactTimelineFeed contactId="c1" />);
    await waitFor(() => expect(getContactTimeline).toHaveBeenCalled());

    for (const label of ["Actividades", "Oportunidades", "Pedidos", "Conversaciones", "Citas"]) {
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
