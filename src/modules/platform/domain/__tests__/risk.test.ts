import { canConfirm, confirmationFor } from "../risk";

describe("confirmación según el riesgo", () => {
  it("cada nivel pide lo suyo", () => {
    expect(confirmationFor("reversible")).toBe("none");
    expect(confirmationFor("important")).toBe("dialog");
    expect(confirmationFor("destructive")).toBe("typed");
  });

  it("reversible e importante no piden escribir nada", () => {
    expect(canConfirm("reversible", "", undefined)).toBe(true);
    expect(canConfirm("important", "", undefined)).toBe(true);
  });

  it("destructivo solo con el texto EXACTO", () => {
    expect(canConfirm("destructive", "Norte Studio", "Norte Studio")).toBe(true);
    expect(canConfirm("destructive", "norte studio", "Norte Studio")).toBe(false);
    expect(canConfirm("destructive", "Norte Studio ", "Norte Studio")).toBe(false);
    expect(canConfirm("destructive", "Norte", "Norte Studio")).toBe(false);
  });

  it("un destructivo sin texto que escribir nunca se habilita (error de quien llama)", () => {
    expect(canConfirm("destructive", "", undefined)).toBe(false);
    expect(canConfirm("destructive", "", "")).toBe(false);
  });
});
