import { act, renderHook } from "@testing-library/react";

/** Handlers registrados por nombre de evento: el test los dispara a mano. */
const handlers = new Map<string, (payload: unknown) => void>();
let mockConnected = true;
jest.mock("@/core/realtime/use-socket", () => ({
  useSocket: () => ({ socket: {}, connected: mockConnected }),
  useSocketEvent: (_socket: unknown, event: string, handler: (payload: unknown) => void) => {
    handlers.set(event, handler);
  },
}));

import { resetCommercialStore, useCommercialStore } from "@/modules/commercial/infrastructure/stores/commercial.store";
import { goalResponse } from "@/modules/commercial/ui/__tests__/fixtures";
import { COMMERCIAL_REALTIME_DEBOUNCE_MS, useCommercialRealtime } from "../use-commercial-realtime";

const refresh = jest.fn().mockResolvedValue(undefined);
const reloadPace = jest.fn().mockResolvedValue(undefined);
const loadProposals = jest.fn().mockResolvedValue(undefined);

function fire(event: string, payload: unknown = {}) {
  act(() => {
    handlers.get(event)?.(payload);
  });
}

function flush() {
  act(() => {
    jest.advanceTimersByTime(COMMERCIAL_REALTIME_DEBOUNCE_MS);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  handlers.clear();
  mockConnected = true;
  resetCommercialStore();
  refresh.mockClear();
  reloadPace.mockClear();
  loadProposals.mockClear();
  useCommercialStore.setState({ refresh, reloadPace, loadProposals, goal: { status: "ready", data: goalResponse, error: null } });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useCommercialRealtime", () => {
  it("una ráfaga del ritmo → UNA recarga de plan y ritmo tras el debounce", () => {
    renderHook(() => useCommercialRealtime({ enabled: true }));
    fire("commercial.pace_updated");
    fire("commercial.plan_recomputed");
    fire("commercial.pace_recovered");
    expect(reloadPace).not.toHaveBeenCalled();
    flush();
    expect(reloadPace).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("`goal_set` recarga la meta entera (refresh, que respeta una carga en vuelo)", () => {
    renderHook(() => useCommercialRealtime({ enabled: true }));
    fire("commercial.goal_set");
    flush();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("con propuestas: `pace_behind` y los eventos de cmo recargan «Axi propone»; sin ellas, no", () => {
    const { unmount } = renderHook(() => useCommercialRealtime({ enabled: true, proposals: true }));
    fire("commercial.pace_behind");
    fire("cmo.proposal_created");
    fire("cmo.proposal_decided");
    flush();
    expect(loadProposals).toHaveBeenCalledTimes(1);
    expect(reloadPace).toHaveBeenCalledTimes(1);
    unmount();

    loadProposals.mockClear();
    renderHook(() => useCommercialRealtime({ enabled: true }));
    fire("cmo.proposal_created");
    flush();
    expect(loadProposals).not.toHaveBeenCalled();
  });

  it("sin meta no pide la lista de propuestas", () => {
    useCommercialStore.setState({ goal: { status: "ready", data: { ...goalResponse, goal: null }, error: null } });
    renderHook(() => useCommercialRealtime({ enabled: true, proposals: true }));
    fire("cmo.proposal_created");
    flush();
    expect(loadProposals).not.toHaveBeenCalled();
  });

  it("sin `enabled` (permiso o capacidad) no hace nada", () => {
    renderHook(() => useCommercialRealtime({ enabled: false, proposals: true }));
    fire("commercial.goal_set");
    fire("commercial.pace_updated");
    fire("cmo.proposal_created");
    flush();
    expect(refresh).not.toHaveBeenCalled();
    expect(reloadPace).not.toHaveBeenCalled();
    expect(loadProposals).not.toHaveBeenCalled();
  });

  it("al reconectar recarga todo: lo emitido con el socket caído se perdió", () => {
    const { rerender } = renderHook(() => useCommercialRealtime({ enabled: true, proposals: true }));
    expect(refresh).not.toHaveBeenCalled();
    mockConnected = false;
    rerender();
    mockConnected = true;
    rerender();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(loadProposals).toHaveBeenCalledTimes(1);
  });
});
