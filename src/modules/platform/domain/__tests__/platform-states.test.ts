import { PLATFORM_STATES, platformState } from "../platform-states";

describe("estado único de la plataforma", () => {
  it("la empresa se nombra en femenino; el resto conserva su rótulo", () => {
    expect(platformState("active", "tenant").label).toBe("Activa");
    expect(platformState("suspended", "tenant").label).toBe("Suspendida");
    expect(platformState("trial", "tenant").label).toBe("En prueba");
    expect(platformState("active").label).toBe("Activo");
    // El tono no cambia con el género.
    expect(platformState("suspended", "tenant").tone).toBe("destructive");
  });

  it("«Trial» ya no se lee en inglés ni como alarma", () => {
    expect(platformState("trial")).toEqual({ label: "En prueba", tone: "info" });
  });

  it("un estado desconocido sale neutro con su valor crudo (se ve raro a propósito)", () => {
    expect(platformState("algo_nuevo")).toEqual({ label: "algo_nuevo", tone: "neutral" });
  });

  it("los transitorios llevan spinner y ningún rótulo queda en inglés técnico", () => {
    expect(platformState("running").transient).toBe(true);
    const english = Object.values(PLATFORM_STATES).filter((entry) => /^(Trial|Timeout|Cutover)$/.test(entry.label));
    expect(english).toEqual([]);
  });
});
