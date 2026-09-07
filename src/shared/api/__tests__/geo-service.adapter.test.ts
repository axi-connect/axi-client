const get = jest.fn();
jest.mock("@/core/services/http", () => ({ http: { get: (...args: unknown[]) => get(...args) } }));

import { searchPlaces } from "@/shared/api/geo-service.adapter";

describe("searchPlaces (geocodificador core)", () => {
  it("llama a /geo/search con q y país y devuelve los items", async () => {
    get.mockResolvedValue({ items: [{ id: "1", name: "Chapinero", lat: 4.6, lng: -74.06 }] });

    const places = await searchPlaces("chapinero", "co");

    expect(get).toHaveBeenCalledWith("/geo/search", { q: "chapinero", country: "co" });
    expect(places).toEqual([{ id: "1", name: "Chapinero", lat: 4.6, lng: -74.06 }]);
  });

  it("el país por defecto es Colombia", async () => {
    get.mockResolvedValue({ items: [] });
    await searchPlaces("usaquen");
    expect(get).toHaveBeenCalledWith("/geo/search", { q: "usaquen", country: "CO" });
  });
});
