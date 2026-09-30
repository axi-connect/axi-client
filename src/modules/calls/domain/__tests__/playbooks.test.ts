import {
  biggestDrop,
  isFixedStage,
  moveStage,
  newStageKey,
  playbookDirty,
  playbookIssues,
  playbookState,
  type PlaybookStage,
  type PlaybookView,
} from "../playbooks";

const stage = (key: string, label = key): PlaybookStage => ({
  key,
  label,
  goal: `Objetivo de ${label}.`,
  advance_when: "Responde.",
  must: [],
  never: [],
});
const STAGES = [stage("apertura", "Apertura"), stage("motivo", "Motivo"), stage("propuesta", "Propuesta"), stage("cierre", "Cierre")];

describe("playbookIssues (espejo del servidor)", () => {
  it("un marco sano no tiene problemas", () => {
    expect(playbookIssues(STAGES, "Saluda y di el motivo.")).toEqual([]);
  });

  it("exige apertura primero, cierre al final y textos en su tope", () => {
    const issues = playbookIssues([stage("motivo"), { ...stage("cierre"), goal: "" }], "x".repeat(401));
    expect(issues).toContain("La primera etapa es la apertura.");
    expect(issues.some((issue) => issue.includes("necesita un objetivo"))).toBe(true);
    expect(issues.some((issue) => issue.includes("guía de apertura"))).toBe(true);
  });
});

describe("moveStage", () => {
  it("mueve las del medio y deja fijas la apertura y el cierre", () => {
    expect(moveStage(STAGES, 1, 1).map((s) => s.key)).toEqual(["apertura", "propuesta", "motivo", "cierre"]);
    expect(moveStage(STAGES, 1, -1).map((s) => s.key)).toEqual(STAGES.map((s) => s.key));
    expect(moveStage(STAGES, 2, 1).map((s) => s.key)).toEqual(STAGES.map((s) => s.key));
    expect(isFixedStage(STAGES[0] as PlaybookStage)).toBe(true);
  });
});

describe("newStageKey", () => {
  it("sale del nombre, sin tildes, y no choca con las existentes", () => {
    expect(newStageKey("Ofrecer demostración", new Set())).toBe("ofrecer_demostracion");
    expect(newStageKey("Motivo", new Set(["motivo"]))).toBe("motivo_2");
    expect(newStageKey("¿?", new Set())).toBe("etapa");
  });
});

describe("playbookDirty / playbookState", () => {
  const view = {
    call_type: "followup",
    label: "Seguimiento",
    enabled: true,
    customized: false,
    base_version: 1,
    playbook: { call_type: "followup", label: "Seguimiento", version: 1, opening_guidance: "Hola", stages: STAGES },
    proposal: null,
    proposed_at: null,
    updated_at: null,
  } satisfies PlaybookView;

  it("sin cambios no hay nada que guardar; cualquier campo lo enciende", () => {
    expect(playbookDirty(view, { enabled: true, opening_guidance: "Hola", stages: STAGES })).toBe(false);
    expect(playbookDirty(view, { enabled: false, opening_guidance: "Hola", stages: STAGES })).toBe(true);
    expect(playbookDirty(view, { enabled: true, opening_guidance: "Hola", stages: STAGES.slice(0, 3) })).toBe(true);
  });

  it("el estado de la ficha: apagado gana, luego propuesta, luego ajustado", () => {
    expect(playbookState(view)).toBe("base");
    expect(playbookState({ ...view, customized: true })).toBe("customized");
    expect(playbookState({ ...view, proposal: view.playbook })).toBe("proposal");
    expect(playbookState({ ...view, enabled: false, proposal: view.playbook })).toBe("off");
  });
});

describe("biggestDrop", () => {
  it("encuentra la mayor caída entre dos etapas; sin caídas, null", () => {
    const type = {
      call_type: "sales_followup",
      label: "Venta",
      total: 10,
      goal_met: 3,
      stages: [
        { key: "apertura", label: "Apertura", reached: 10 },
        { key: "propuesta", label: "Propuesta", reached: 9 },
        { key: "objeciones", label: "Objeciones", reached: 4 },
        { key: "cierre", label: "Cierre", reached: 3 },
      ],
    };
    expect(biggestDrop(type)).toEqual({ from: "Propuesta", to: "Objeciones", lost: 5 });
    expect(biggestDrop({ ...type, stages: type.stages.map((s) => ({ ...s, reached: 10 })) })).toBeNull();
  });
});
