import { extractLocationPayload } from "@/modules/inbox/domain/inbox";

describe("extractLocationPayload (burbuja de ubicación, también SALIENTE)", () => {
  it("lee el payload que persiste el servidor para el pin de una sede (S6)", () => {
    expect(
      extractLocationPayload({
        location: { latitude: 4.6, longitude: -74.07, name: "Centro", address: "Cra 7 # 12-34, Bogotá" },
      }),
    ).toEqual({ latitude: 4.6, longitude: -74.07, name: "Centro", address: "Cra 7 # 12-34, Bogotá" });
  });

  it("sin coordenadas numéricas no hay burbuja (cae a «no disponible»)", () => {
    expect(extractLocationPayload({ location: { latitude: "4.6", longitude: -74.07 } })).toBeNull();
    expect(extractLocationPayload(null)).toBeNull();
  });
});
