import { render } from "@testing-library/react";

import { useCmoSocket } from "../use-cmo-socket";

/**
 * El enrutado de los ocho eventos y la RECARGA en reconexión no tenían ni un
 * test (hueco de la auditoría). La reconexión importa más de lo que parece:
 * los eventos emitidos con el socket caído se perdieron, y sin recargar el
 * dueño mira una bandeja con propuestas que ya no existen.
 */

type Handler = (payload: unknown) => void;

const handlers = new Map<string, Handler>();
let connected = false;

jest.mock("@/core/realtime/use-socket", () => ({
  useSocket: () => ({ socket: {}, connected }),
  useSocketEvent: (_socket: unknown, event: string, handler: Handler) => {
    handlers.set(event, handler);
  },
}));

const store = {
  onBriefingReady: jest.fn(),
  onProposalCreated: jest.fn(),
  onProposalDecided: jest.fn(),
  onTurnStarted: jest.fn(),
  onTurnStep: jest.fn(),
  onTurnDelta: jest.fn(),
  onTurnCompleted: jest.fn(),
  onTurnFailed: jest.fn(),
  load: jest.fn(),
};

jest.mock("@/modules/cmo/infrastructure/stores/cmo.store", () => ({
  useCmoStore: Object.assign(() => undefined, { getState: () => store }),
}));

function Probe() {
  useCmoSocket();
  return null;
}

describe("useCmoSocket", () => {
  beforeEach(() => {
    handlers.clear();
    connected = false;
    jest.clearAllMocks();
  });

  it("enruta los ocho eventos cmo.* a su handler del store", () => {
    render(<Probe />);
    const expected: [string, jest.Mock][] = [
      ["cmo.briefing_ready", store.onBriefingReady],
      ["cmo.proposal_created", store.onProposalCreated],
      ["cmo.proposal_decided", store.onProposalDecided],
      ["cmo.turn_started", store.onTurnStarted],
      ["cmo.turn_step", store.onTurnStep],
      ["cmo.turn_delta", store.onTurnDelta],
      ["cmo.turn_completed", store.onTurnCompleted],
      ["cmo.turn_failed", store.onTurnFailed],
    ];
    for (const [event, mock] of expected) {
      const handler = handlers.get(event);
      expect(handler).toBeDefined();
      handler?.({ seq: 1 });
      expect(mock).toHaveBeenCalledWith({ seq: 1 });
    }
  });

  it("la PRIMERA conexión no recarga; la RECONEXIÓN sí recarga todo", () => {
    connected = true;
    const view = render(<Probe />);
    // Primera conexión: la carga inicial ya la hizo la vista.
    expect(store.load).not.toHaveBeenCalled();

    connected = false;
    view.rerender(<Probe />);
    expect(store.load).not.toHaveBeenCalled();

    connected = true;
    view.rerender(<Probe />);
    // Se cayó y volvió: lo que pasó mientras tanto se perdió — se recarga.
    expect(store.load).toHaveBeenCalledTimes(1);
  });
});
