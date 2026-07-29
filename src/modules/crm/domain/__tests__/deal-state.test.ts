import { canTransition, daysInStage, DEAL_TRANSITIONS, isStalled, isTerminal } from "../deal-state";

describe("deal-state", () => {
  it("modela la máquina open ─win/lose→ won|lost ─reopen→ open", () => {
    expect(canTransition("open", "won")).toBe(true);
    expect(canTransition("open", "lost")).toBe(true);
    expect(canTransition("won", "open")).toBe(true);
    expect(canTransition("lost", "open")).toBe(true);
    expect(canTransition("won", "lost")).toBe(false);
    expect(canTransition("lost", "won")).toBe(false);
    expect(DEAL_TRANSITIONS.open).toHaveLength(2);
  });

  it("won y lost son terminales; open no", () => {
    expect(isTerminal("open")).toBe(false);
    expect(isTerminal("won")).toBe(true);
    expect(isTerminal("lost")).toBe(true);
  });

  describe("daysInStage", () => {
    const now = new Date("2026-07-29T12:00:00Z");

    it("cuenta días completos en la etapa", () => {
      expect(daysInStage("2026-07-29T09:00:00Z", now)).toBe(0);
      expect(daysInStage("2026-07-27T12:00:00Z", now)).toBe(2);
      expect(daysInStage("2026-07-20T11:00:00Z", now)).toBe(9);
    });

    it("fecha inválida o futura → 0 (nunca negativos)", () => {
      expect(daysInStage("garbage", now)).toBe(0);
      expect(daysInStage("2026-08-15T00:00:00Z", now)).toBe(0);
    });
  });

  describe("isStalled (derivado en cliente — el DTO no trae stalled_notified_at)", () => {
    const now = new Date("2026-07-29T12:00:00Z");
    const nineDaysAgo = "2026-07-20T11:00:00Z";

    it("open y más días en etapa que rotting_days → estancado", () => {
      expect(isStalled({ status: "open", stage_entered_at: nineDaysAgo }, 7, now)).toBe(true);
      expect(isStalled({ status: "open", stage_entered_at: nineDaysAgo }, 9, now)).toBe(true);
      expect(isStalled({ status: "open", stage_entered_at: nineDaysAgo }, 10, now)).toBe(false);
    });

    it("etapa sin expiración (null/0) → nunca estancado", () => {
      expect(isStalled({ status: "open", stage_entered_at: nineDaysAgo }, null, now)).toBe(false);
      expect(isStalled({ status: "open", stage_entered_at: nineDaysAgo }, undefined, now)).toBe(false);
      expect(isStalled({ status: "open", stage_entered_at: nineDaysAgo }, 0, now)).toBe(false);
    });

    it("won/lost nunca están estancados", () => {
      expect(isStalled({ status: "won", stage_entered_at: nineDaysAgo }, 7, now)).toBe(false);
      expect(isStalled({ status: "lost", stage_entered_at: nineDaysAgo }, 7, now)).toBe(false);
    });
  });
});
