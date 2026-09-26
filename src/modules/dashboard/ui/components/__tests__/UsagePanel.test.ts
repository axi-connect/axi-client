import { cycleLabel } from "../UsagePanel";

describe("cycleLabel", () => {
  it("la ventana [inicio, fin) en la zona del negocio: el fin exclusivo no suma un día", () => {
    // Medianoches de Bogotá (UTC−5): en UTC caen a las 05:00.
    expect(cycleLabel("2026-09-01T05:00:00Z", "2026-10-01T05:00:00Z", "America/Bogota")).toBe("ciclo 1 – 30 sept");
  });

  it("un ciclo que cruza de mes nombra los dos", () => {
    expect(cycleLabel("2026-09-23T05:00:00Z", "2026-10-23T05:00:00Z", "America/Bogota")).toBe("ciclo 23 sept – 22 oct");
  });

  it("fechas ilegibles no inventan un ciclo", () => {
    expect(cycleLabel("x", "y", "America/Bogota")).toBe("");
  });
});
