const mockGet = jest.fn<Promise<unknown>, [string]>();
jest.mock("@/core/services/http", () => ({
  http: { get: (path: string) => mockGet(path) },
}));

import {
  featureIn,
  hasFeatureIn,
  resetFeaturesStore,
  useFeaturesStore,
  type FeatureDetailDTO,
} from "@/shared/auth/features.store";

const feature = (overrides: Partial<FeatureDetailDTO> = {}): FeatureDetailDTO => ({
  code: "payment_plans",
  label: "Planes de pago",
  description: "Anticipo, cuotas y saldo por pedido",
  enabled: true,
  source: "niche",
  locked: false,
  blocked_by: null,
  requires_capability: "sales",
  requires: [],
  ...overrides,
});

describe("features.store", () => {
  beforeEach(() => {
    resetFeaturesStore();
    mockGet.mockReset();
  });

  it("carga una sola vez por usuario y comparte el resultado", async () => {
    mockGet.mockResolvedValue({ features: [feature()] });
    const { load } = useFeaturesStore.getState();

    await Promise.all([load("u1"), load("u1")]);
    await load("u1");

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith("/me/features");
    expect(useFeaturesStore.getState().status).toBe("ready");
  });

  it("un error de red deja fail-open: hasFeature responde true en vez de esconder el panel", async () => {
    mockGet.mockRejectedValue(new Error("red caída"));
    await useFeaturesStore.getState().load("u1");

    const { features, status } = useFeaturesStore.getState();
    expect(status).toBe("error");
    expect(hasFeatureIn(features, status, "payment_plans")).toBe(true);
  });

  it("mientras carga NO afirma nada: ni encendida ni apagada", () => {
    expect(hasFeatureIn(null, "loading", "payment_plans")).toBe(false);
    expect(hasFeatureIn(null, "idle", "payment_plans")).toBe(false);
  });

  it("una función apagada o desconocida responde false con la carga lista", async () => {
    mockGet.mockResolvedValue({
      features: [feature({ enabled: false, source: "default" })],
    });
    await useFeaturesStore.getState().load("u1");
    const { features, status } = useFeaturesStore.getState();

    expect(hasFeatureIn(features, status, "payment_plans")).toBe(false);
    expect(hasFeatureIn(features, status, "teletransporte")).toBe(false);
    expect(featureIn(features, "teletransporte")).toBeNull();
  });

  it("`refresh` vuelve a pedir: cambiar el tipo de negocio cambia el origen", async () => {
    mockGet.mockResolvedValue({ features: [feature({ enabled: false, source: "default" })] });
    await useFeaturesStore.getState().load("u1");

    mockGet.mockResolvedValue({ features: [feature({ enabled: true, source: "niche" })] });
    await useFeaturesStore.getState().refresh();

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(featureIn(useFeaturesStore.getState().features, "payment_plans")?.source).toBe("niche");
  });

  it("cambiar de sesión recarga para el usuario nuevo", async () => {
    mockGet.mockResolvedValue({ features: [feature()] });
    await useFeaturesStore.getState().load("u1");
    await useFeaturesStore.getState().load("u2");

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(useFeaturesStore.getState().for_user_id).toBe("u2");
  });
});
