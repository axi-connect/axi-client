import { http } from "@/core/services/http";
import { archiveThread, listThreads } from "../cmo-service.adapter";

/**
 * El contrato de las conversaciones: la lista viene envuelta en `{ data }` y
 * archivar es un POST sin cuerpo relevante a `/cmo/threads/:id/archive`. No hay
 * `createThread`: el hilo nace con el primer mensaje.
 */
jest.mock("@/core/services/http", () => ({
  http: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const mocked = http as jest.Mocked<typeof http>;

describe("conversaciones", () => {
  it("listThreads desenvuelve `data`", async () => {
    mocked.get.mockResolvedValue({ data: [{ id: "t1", title: null, last_message_at: "x", created_at: "x" }] });
    const threads = await listThreads();
    expect(mocked.get).toHaveBeenCalledWith("/cmo/threads");
    expect(threads).toHaveLength(1);
  });

  it("archiveThread hace POST a /cmo/threads/:id/archive", async () => {
    mocked.post.mockResolvedValue(undefined);
    await archiveThread("t1");
    expect(mocked.post).toHaveBeenCalledWith("/cmo/threads/t1/archive", {});
  });
});
