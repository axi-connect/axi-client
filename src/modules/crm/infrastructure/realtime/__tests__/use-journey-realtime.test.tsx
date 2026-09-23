import { act, renderHook } from "@testing-library/react";

const handlers = new Map<string, (payload: unknown) => void>();
jest.mock("@/core/realtime/use-socket", () => ({
  useSocket: () => ({ socket: {}, connected: true }),
  useSocketEvent: (_socket: unknown, event: string, handler: (payload: unknown) => void) => {
    handlers.set(event, handler);
  },
}));

import { subscribeJourneyChanged } from "@/modules/crm/infrastructure/journey-events";
import { JOURNEY_REALTIME_DEBOUNCE_MS, useJourneyRealtime } from "../use-journey-realtime";

beforeEach(() => {
  jest.useFakeTimers();
  handlers.clear();
});
afterEach(() => {
  jest.useRealTimers();
});

function fire(event: string, payload: unknown) {
  act(() => {
    handlers.get(event)?.(payload);
  });
}

describe("useJourneyRealtime", () => {
  it("un paso de etapa de ESTE contacto se reemite como crm:journey:changed (una vez por ráfaga)", () => {
    const heard = jest.fn();
    const off = subscribeJourneyChanged("c1", heard);
    renderHook(() => useJourneyRealtime("c1"));

    fire("crm.deal_stage_changed", { contact_id: "c1", deal_id: "d1" });
    fire("crm.deal_stage_reverted", { contact_id: "c1", deal_id: "d1" });
    expect(heard).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(JOURNEY_REALTIME_DEBOUNCE_MS);
    });
    expect(heard).toHaveBeenCalledTimes(1);
    expect(heard).toHaveBeenCalledWith({ contactId: "c1", dealId: "d1" });
    off();
  });

  it("el de otro contacto no dispara nada", () => {
    const heard = jest.fn();
    const off = subscribeJourneyChanged("c1", heard);
    renderHook(() => useJourneyRealtime("c1"));
    fire("crm.deal_stage_changed", { contact_id: "c2", deal_id: "d9" });
    act(() => {
      jest.advanceTimersByTime(JOURNEY_REALTIME_DEBOUNCE_MS);
    });
    expect(heard).not.toHaveBeenCalled();
    off();
  });
});
