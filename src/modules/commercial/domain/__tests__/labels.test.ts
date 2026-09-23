import { isOffPace, KR_LABELS, KR_ORDER, PACE_BADGES, sourceLabel } from "../labels";

describe("labels", () => {
  it("cada estado del ritmo tiene badge y solo lo que está fuera de ritmo lo pinta", () => {
    for (const status of Object.keys(PACE_BADGES)) {
      expect(PACE_BADGES[status].label).not.toBe("");
    }
    expect(isOffPace("on_track")).toBe(false);
    expect(isOffPace("insufficient_data")).toBe(false);
    expect(isOffPace("behind")).toBe(true);
    expect(isOffPace("ahead")).toBe(true);
  });

  it("el nicho solo cambia la etiqueta del supuesto", () => {
    expect(sourceLabel("benchmark", "clínicas estéticas")).toBe("supuesto para clínicas estéticas");
    expect(sourceLabel("benchmark", null)).toBe("supuesto para tu tipo de negocio");
    expect(sourceLabel("history", "clínicas estéticas")).toBe("según tu historia");
  });

  it("los dos umbrales bajos dicen lo mismo, y las llamadas son las hechas", () => {
    expect(PACE_BADGES.behind.label).toBe("Ritmo bajo");
    expect(PACE_BADGES.at_risk.label).toBe("Ritmo bajo");
    expect(KR_LABELS.calls).toBe("Llamadas hechas");
  });

  it("el orden de la lista cubre todas las etiquetas", () => {
    expect([...KR_ORDER].sort()).toEqual(Object.keys(KR_LABELS).sort());
  });
});
