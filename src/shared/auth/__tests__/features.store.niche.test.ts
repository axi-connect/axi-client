const mockGet = jest.fn<Promise<unknown>, [string]>();
jest.mock("@/core/services/http", () => ({
  http: { get: (path: string) => mockGet(path) },
}));

import {
  resetFeaturesStore,
  useFeaturesStore,
} from "@/shared/auth/features.store";

describe("features.store · niche_defaults (Cobros premium P1)", () => {
  beforeEach(() => {
    resetFeaturesStore();
    mockGet.mockReset();
  });

  it("guarda lo que sugiere cada tipo de negocio junto a las funciones", async () => {
    mockGet.mockResolvedValue({
      features: [],
      niche_defaults: { hotels_tourism: ["payment_plans", "documents"] },
    });
    await useFeaturesStore.getState().load("u1");
    expect(useFeaturesStore.getState().niche_defaults).toEqual({
      hotels_tourism: ["payment_plans", "documents"],
    });
  });

  it("si la carga falla no queda un mapa viejo: vuelve a null, y el reset también lo borra", async () => {
    mockGet.mockResolvedValueOnce({
      features: [],
      niche_defaults: { education: ["documents"] },
    });
    await useFeaturesStore.getState().load("u1");
    mockGet.mockRejectedValueOnce(new Error("red"));
    await useFeaturesStore.getState().refresh();
    expect(useFeaturesStore.getState().niche_defaults).toBeNull();

    mockGet.mockResolvedValueOnce({
      features: [],
      niche_defaults: { education: ["documents"] },
    });
    await useFeaturesStore.getState().refresh();
    resetFeaturesStore();
    expect(useFeaturesStore.getState().niche_defaults).toBeNull();
  });
});
