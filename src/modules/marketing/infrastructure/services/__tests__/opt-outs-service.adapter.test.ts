import { http } from "@/core/services/http";
import { revokeOptOut } from "../opt-outs-service.adapter";

jest.mock("@/core/services/http", () => ({ http: { post: jest.fn(() => Promise.resolve()) } }));

/** P1: revocar un habeas data exige el reconocimiento también en la API. */
describe("revokeOptOut", () => {
  afterEach(() => jest.clearAllMocks());

  it("sin reconocimiento manda el cuerpo vacío (una baja normal)", async () => {
    await revokeOptOut("opt-1");
    expect(http.post).toHaveBeenCalledWith("/marketing/opt-outs/opt-1/revoke", {});
  });

  it("con la casilla marcada manda acknowledge_habeas", async () => {
    await revokeOptOut("opt-1", { acknowledge_habeas: true });
    expect(http.post).toHaveBeenCalledWith("/marketing/opt-outs/opt-1/revoke", { acknowledge_habeas: true });
  });
});
