import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { HttpError } from "@/core/api/problem";
import type { ChannelDTO } from "@/modules/channels/domain/channel";

const requestCoexistenceSync = jest.fn();
jest.mock("@/modules/channels/infrastructure/services/meta-signup.adapter", () => ({
  requestCoexistenceSync: (id: string, payload: unknown) => requestCoexistenceSync(id, payload),
}));

/** Handlers del socket por evento: el test dispara el progreso a mano (F2b). */
const socketHandlers = new Map<string, (payload: unknown) => void>();
jest.mock("@/core/realtime/use-socket", () => ({
  useSocket: () => ({ socket: {}, connected: true }),
  useSocketEvent: (_socket: unknown, event: string, handler: (payload: unknown) => void) => {
    socketHandlers.set(event, handler);
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { CoexistenceImportCard } = require("../CoexistenceImportCard") as typeof import("../CoexistenceImportCard");

const HOUR_MS = 60 * 60 * 1000;

function channel(overrides: Partial<NonNullable<ChannelDTO["coexistence"]>> = {}): ChannelDTO {
  const connected = new Date(Date.now() - HOUR_MS);
  return {
    id: "ch-1",
    coexistence: {
      connected_at: connected.toISOString(),
      phone_operator_user_id: "u-1",
      handback_after_minutes: 720,
      sync: {
        contacts: "pending",
        history: "pending",
        requested_at: null,
        history_progress: 0,
        request_ids: {},
      },
      sync_window_closes_at: new Date(connected.getTime() + 24 * HOUR_MS).toISOString(),
      ...overrides,
    },
  } as unknown as ChannelDTO;
}

/**
 * La importación desde la app del celular (F1) es una decisión con reloj: Meta
 * la acepta una vez y en 24 h. Se prueba que la tarjeta lo haga visible y que
 * pida EXACTAMENTE lo que quedó marcado y pendiente.
 */
describe("CoexistenceImportCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    socketHandlers.clear();
  });

  it("no pinta nada para un canal estándar", () => {
    const { container } = render(
      <CoexistenceImportCard
        channel={{ id: "ch-1", coexistence: null } as unknown as ChannelDTO}
        onChannel={jest.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("ofrece contactos e historial marcados (D1) con el plazo a la vista", () => {
    render(<CoexistenceImportCard channel={channel()} onChannel={jest.fn()} />);

    expect(screen.getByRole("checkbox", { name: /importar contactos/i })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /últimos 6 meses/i })).toBeChecked();
    expect(screen.getByText(/disponible hasta/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /importar ahora/i })).toBeEnabled();
  });

  it("pide solo lo marcado y entrega el canal actualizado a quien la monta", async () => {
    const updated = channel({
      sync: {
        contacts: "requested",
        history: "pending",
        requested_at: new Date().toISOString(),
        history_progress: 0,
        request_ids: { smb_app_state_sync: "req-1" },
      },
    });
    requestCoexistenceSync.mockResolvedValue(updated);
    const onChannel = jest.fn();
    render(<CoexistenceImportCard channel={channel()} onChannel={onChannel} />);

    fireEvent.click(screen.getByRole("checkbox", { name: /últimos 6 meses/i }));
    fireEvent.click(screen.getByRole("button", { name: /importar ahora/i }));

    await waitFor(() => expect(onChannel).toHaveBeenCalledWith(updated));
    expect(requestCoexistenceSync).toHaveBeenCalledWith("ch-1", { contacts: true, history: false });
  });

  it("lo ya pedido se muestra como tal y no se puede volver a pedir", () => {
    render(
      <CoexistenceImportCard
        channel={channel({
          sync: {
            contacts: "requested",
            history: "requested",
            requested_at: new Date().toISOString(),
            history_progress: 0,
            request_ids: {},
          },
        })}
        onChannel={jest.fn()}
      />,
    );

    expect(screen.getAllByText(/^pedido$/i)).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /importar ahora/i })).toBeNull();
    expect(screen.getByText(/deja whatsapp business abierta/i)).toBeInTheDocument();
  });

  it("pasadas las 24 h explica que ya no se puede y cómo se recupera", () => {
    const connected = new Date(Date.now() - 30 * HOUR_MS);
    render(
      <CoexistenceImportCard
        channel={channel({
          connected_at: connected.toISOString(),
          sync_window_closes_at: new Date(connected.getTime() + 24 * HOUR_MS).toISOString(),
        })}
        onChannel={jest.fn()}
      />,
    );

    expect(screen.getByText(/ya no acepta la importación/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /importar ahora/i })).toBeNull();
  });

  it("un rechazo del backend se muestra con su mensaje, sin tragarse el error", async () => {
    requestCoexistenceSync.mockRejectedValue(
      new HttpError({
        status: 409,
        code: "channels/meta_coexistence_sync_already_requested",
        message: "Esa importación ya se pidió",
      }),
    );
    render(<CoexistenceImportCard channel={channel()} onChannel={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /importar ahora/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });

  it("mientras importa muestra la barra con el progreso que llega por WS (F2b)", () => {
    const onChannel = jest.fn();
    const inProgress = channel({
      sync: {
        contacts: "completed",
        history: "in_progress",
        requested_at: new Date().toISOString(),
        history_progress: 43,
        request_ids: {},
      },
    });
    render(<CoexistenceImportCard channel={inProgress} onChannel={onChannel} />);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "43");
    expect(screen.getByText(/^importando$/i)).toBeInTheDocument();

    // Llega un lote más: quien monta la tarjeta recibe el canal con el sync nuevo
    socketHandlers.get("channel.coexistence_sync")?.({
      channel_id: "ch-1",
      company_id: "co-1",
      contacts: "completed",
      history: "completed",
      history_progress: 100,
    });
    expect(onChannel).toHaveBeenCalledWith(
      expect.objectContaining({
        coexistence: expect.objectContaining({
          sync: expect.objectContaining({ history: "completed", history_progress: 100 }),
        }),
      }),
    );
  });

  it("ignora el progreso de OTRO canal", () => {
    const onChannel = jest.fn();
    render(<CoexistenceImportCard channel={channel()} onChannel={onChannel} />);

    socketHandlers.get("channel.coexistence_sync")?.({
      channel_id: "otro",
      company_id: "co-1",
      contacts: "completed",
      history: "completed",
      history_progress: 100,
    });
    expect(onChannel).not.toHaveBeenCalled();
  });
});
