const mockGet = jest.fn<Promise<unknown>, [string]>();
jest.mock("@/core/services/http", () => ({
  http: { get: (path: string) => mockGet(path) },
}));

import {
  REVALIDATE_AFTER_MS,
  resetEntitlementsStore,
  useEntitlementsStore,
} from "@/shared/auth/entitlements.store";

const agenda = { capabilities: ["scheduling"] };
const pro = { capabilities: ["scheduling", "sales", "marketing"] };

describe("entitlements.store — revalidate", () => {
  beforeEach(() => {
    resetEntitlementsStore();
    mockGet.mockReset();
    jest.restoreAllMocks();
  });

  it("tras el plazo relee en silencio: un cambio de plan llega sin cerrar sesión", async () => {
    mockGet.mockResolvedValueOnce(agenda).mockResolvedValueOnce(pro);
    const now = jest.spyOn(Date, "now").mockReturnValue(1_000);
    await useEntitlementsStore.getState().load("u1");

    now.mockReturnValue(1_000 + REVALIDATE_AFTER_MS + 1);
    await useEntitlementsStore.getState().revalidate("u1");

    const state = useEntitlementsStore.getState();
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(state.status).toBe("ready");
    expect(state.entitlements).toEqual(pro);
  });

  it("antes del plazo no relee", async () => {
    mockGet.mockResolvedValue(agenda);
    jest.spyOn(Date, "now").mockReturnValue(1_000);
    await useEntitlementsStore.getState().load("u1");
    await useEntitlementsStore.getState().revalidate("u1");

    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it("un fallo al releer conserva lo que había", async () => {
    mockGet.mockResolvedValueOnce(agenda).mockRejectedValueOnce(new Error("red"));
    const now = jest.spyOn(Date, "now").mockReturnValue(1_000);
    await useEntitlementsStore.getState().load("u1");

    now.mockReturnValue(1_000 + REVALIDATE_AFTER_MS + 1);
    await useEntitlementsStore.getState().revalidate("u1");

    const state = useEntitlementsStore.getState();
    expect(state.status).toBe("ready");
    expect(state.entitlements).toEqual(agenda);
  });

  it("no relee para otro usuario ni sin carga previa", async () => {
    await useEntitlementsStore.getState().revalidate("u1");
    expect(mockGet).not.toHaveBeenCalled();
  });
});
