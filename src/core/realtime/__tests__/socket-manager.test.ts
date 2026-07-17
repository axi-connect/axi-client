/**
 * F15 — halt del SocketManager: tras `company.suspended` el token está
 * bumpeado; `halt()` desconecta todo y bloquea nuevos `connect()` hasta
 * `reset()` (login exitoso). Sin el guard, la desconexión forzada del server
 * dispararía la reconexión automática de socket.io en loop.
 */

const ioMock = jest.fn();

jest.mock("socket.io-client", () => ({
  io: (...args: unknown[]) => ioMock(...args),
}));

import { socketManager } from "../socket-manager";

function makeFakeSocket() {
  return {
    connected: false,
    auth: {},
    on: jest.fn(),
    off: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    removeAllListeners: jest.fn(),
  };
}

beforeEach(() => {
  ioMock.mockReset();
  ioMock.mockImplementation(() => makeFakeSocket());
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ token: "jwt", expires_at: Date.now() + 900_000 }),
  }) as unknown as typeof fetch;
  socketManager.reset();
  socketManager.disconnectAll();
});

afterEach(() => {
  socketManager.reset();
  socketManager.disconnectAll();
});

describe("SocketManager — halt/reset (F15)", () => {
  it("halt() desconecta los sockets activos y bloquea connect()", async () => {
    const socket = (await socketManager.connect("inbox")) as unknown as ReturnType<typeof makeFakeSocket>;
    expect(ioMock).toHaveBeenCalledTimes(1);

    socketManager.halt();

    expect(socket.disconnect).toHaveBeenCalled();
    await expect(socketManager.connect("inbox")).rejects.toThrow(/suspendida/);
    expect(ioMock).toHaveBeenCalledTimes(1); // no se creó un socket nuevo
  });

  it("reset() vuelve a permitir connect()", async () => {
    socketManager.halt();
    await expect(socketManager.connect("channels")).rejects.toThrow();

    socketManager.reset();

    await expect(socketManager.connect("channels")).resolves.toBeDefined();
    expect(ioMock).toHaveBeenCalledTimes(1);
  });
});
