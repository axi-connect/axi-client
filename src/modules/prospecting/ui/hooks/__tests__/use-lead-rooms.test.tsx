import { act, renderHook } from "@testing-library/react";

import { useLeadRooms } from "../use-lead-rooms";

const emitWithAck = jest.fn<Promise<{ ok: boolean }>, [unknown, string, { lead_id: string }]>(() =>
  Promise.resolve({ ok: true }),
);
jest.mock("@/core/realtime/socket-manager", () => ({
  socketManager: {
    emitWithAck: (socket: unknown, event: string, payload: { lead_id: string }) =>
      emitWithAck(socket, event, payload),
  },
}));

function fakeSocket() {
  const handlers = new Map<string, () => void>();
  return {
    on: jest.fn((event: string, handler: () => void) => handlers.set(event, handler)),
    off: jest.fn((event: string) => handlers.delete(event)),
    fire: (event: string) => handlers.get(event)?.(),
  };
}

const calls = (event: string) =>
  emitWithAck.mock.calls.filter(([, name]) => name === event).map(([, , payload]) => payload.lead_id);

describe("useLeadRooms", () => {
  beforeEach(() => emitWithAck.mockClear());

  it("entra a la sala de cada lead que se espera y sale de la que dejó de importar", async () => {
    const socket = fakeSocket();
    const { rerender } = renderHook(({ ids }) => useLeadRooms(socket as never, ids, () => undefined), {
      initialProps: { ids: ["a", "b"] },
    });
    await act(async () => {});
    expect(calls("inbox.join_lead")).toEqual(["a", "b"]);

    rerender({ ids: ["b"] });
    await act(async () => {});
    expect(calls("inbox.leave_lead")).toEqual(["a"]);
    // «b» ya estaba: no se vuelve a pedir.
    expect(calls("inbox.join_lead")).toEqual(["a", "b"]);
  });

  it("AL RECONECTAR vuelve a entrar y pide releer: lo de mientras no llegó", async () => {
    const socket = fakeSocket();
    const onResync = jest.fn();
    renderHook(() => useLeadRooms(socket as never, ["a"], onResync));
    await act(async () => {});

    act(() => socket.fire("connect"));
    await act(async () => {});

    expect(calls("inbox.join_lead")).toEqual(["a", "a"]);
    expect(onResync).toHaveBeenCalledTimes(1);
  });

  it("sin nada que esperar no entra a ninguna sala", async () => {
    const socket = fakeSocket();
    renderHook(() => useLeadRooms(socket as never, [], () => undefined));
    await act(async () => {});
    expect(emitWithAck).not.toHaveBeenCalled();
  });
});
