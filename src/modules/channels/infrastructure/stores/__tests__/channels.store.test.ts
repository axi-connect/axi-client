import type { ChannelDTO } from "@/modules/channels/domain/channel";

/**
 * La carrera WS ↔ fetch. `fetchChannels` reemplazaba la lista y
 * `setChannelStatus` descartaba los eventos de canales que aún no estaban en
 * ella: un canal que Meta acababa de revocar podía volver a pintarse conectado.
 */
const listChannels = jest.fn();
jest.mock("@/modules/channels/infrastructure/services/channels-service.adapter", () => ({
  listChannels: () => listChannels(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useChannelStore } = require("../channels.store") as typeof import("../channels.store");

function channel(overrides: Partial<ChannelDTO>): ChannelDTO {
  return { id: "ch-1", name: "Ventas", kind: "whatsapp_cloud", status: "connected", ...overrides } as ChannelDTO;
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks();
  useChannelStore.setState({ channels: [], statusEvents: {}, loading: true, error: null });
});

describe("channels.store — fusión de snapshot y eventos", () => {
  it("un evento que llega DURANTE la carga inicial sobrevive al snapshot", async () => {
    const pending = deferred<{ data: ChannelDTO[] }>();
    listChannels.mockReturnValue(pending.promise);

    const fetching = useChannelStore.getState().fetchChannels();
    // El canal aún no está en la lista: antes esto se descartaba en silencio
    useChannelStore.getState().setChannelStatus("ch-1", "error");
    pending.resolve({ data: [channel({ status: "connected" })] });
    await fetching;

    expect(useChannelStore.getState().channels[0]?.status).toBe("error");
  });

  it("«Actualizar» con una respuesta vieja no pisa un evento más reciente", async () => {
    useChannelStore.setState({ channels: [channel({ status: "connected" })], loading: false });
    const pending = deferred<{ data: ChannelDTO[] }>();
    listChannels.mockReturnValue(pending.promise);

    const fetching = useChannelStore.getState().fetchChannels();
    useChannelStore.getState().setChannelStatus("ch-1", "disconnected", "+57 300");
    // El servidor responde con lo que tenía ANTES del evento
    pending.resolve({ data: [channel({ status: "connected" })] });
    await fetching;

    const updated = useChannelStore.getState().channels[0];
    expect(updated?.status).toBe("disconnected");
    expect(updated?.display_phone_number).toBe("+57 300");
  });

  it("un evento ANTERIOR al fetch ya viene en el snapshot: no se reaplica", async () => {
    useChannelStore.getState().setChannelStatus("ch-1", "error");
    // Simula que pasó tiempo: el evento es viejo respecto al fetch
    const event = useChannelStore.getState().statusEvents["ch-1"];
    useChannelStore.setState({ statusEvents: { "ch-1": { ...event, at: event.at - 10_000 } } });
    listChannels.mockResolvedValue({ data: [channel({ status: "connected" })] });

    await useChannelStore.getState().fetchChannels();

    expect(useChannelStore.getState().channels[0]?.status).toBe("connected");
    // Y la memoria se limpia: no crece para siempre
    expect(useChannelStore.getState().statusEvents["ch-1"]).toBeUndefined();
  });

  it("si el fetch falla, la lista que había NO se toca", async () => {
    useChannelStore.setState({ channels: [channel({})], loading: false });
    listChannels.mockRejectedValue(new Error("red"));

    await useChannelStore.getState().fetchChannels();

    expect(useChannelStore.getState().channels).toHaveLength(1);
    expect(useChannelStore.getState().error).not.toBeNull();
    expect(useChannelStore.getState().loading).toBe(false);
  });

  it("borrar un canal olvida también su evento", () => {
    useChannelStore.setState({ channels: [channel({})] });
    useChannelStore.getState().setChannelStatus("ch-1", "error");

    useChannelStore.getState().removeChannel("ch-1");

    expect(useChannelStore.getState().channels).toEqual([]);
    expect(useChannelStore.getState().statusEvents["ch-1"]).toBeUndefined();
  });
});
