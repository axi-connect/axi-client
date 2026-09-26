import { composeLostReason, LOSE_REASONS } from "../WinLoseDialog";

describe("composeLostReason — el motivo tal como queda guardado", () => {
  it("motivo rápido + detalle", () => {
    expect(composeLostReason("Sin respuesta", " No volvió a escribir. ")).toBe("Sin respuesta · No volvió a escribir.");
  });
  it("solo el motivo, o solo el detalle", () => {
    expect(composeLostReason("Precio", "")).toBe("Precio");
    expect(composeLostReason(null, "Se fue con otra agencia")).toBe("Se fue con otra agencia");
  });
  it("«Otro motivo» no se escribe: lo dice el detalle", () => {
    expect(composeLostReason("Otro motivo", "Cambio de trabajo")).toBe("Cambio de trabajo");
    expect(composeLostReason("Otro motivo", "")).toBe("");
  });
  it("sin nada queda vacío (el servidor recibe undefined)", () => {
    expect(composeLostReason(null, "   ")).toBe("");
    expect(LOSE_REASONS).toContain("Sin respuesta");
  });
});
