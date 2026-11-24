import { notThemStanding } from "../use-not-them";

jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn(), showModal: jest.fn(), closeModal: jest.fn() }),
}));
jest.mock("../../../infrastructure/services/prospecting-service.adapter", () => ({
  demoteDecisionMaker: jest.fn(),
  discardLead: jest.fn(),
}));

describe("notThemStanding — de qué fuente es la persona", () => {
  it("M4 · «registro» solo si la trajo el registro mercantil", () => {
    expect(notThemStanding({ provider: "rues", confirmed_by: "source", member_confirmed: false })).toBe("registry");
  });

  it("M4 · un hecho de Apollo NO es del registro, aunque también venga confirmado por su fuente", () => {
    // Nadie del equipo dijo que trabaja aquí: puede no trabajar aquí o no decidir.
    expect(notThemStanding({ provider: "apollo", confirmed_by: "source", member_confirmed: false })).toBe("open");
  });

  it("confirmada por el equipo: trabaja aquí, y solo cabe decir que no decide", () => {
    expect(notThemStanding({ provider: "site_extractor", confirmed_by: null, member_confirmed: true })).toBe("member_confirmed");
    expect(notThemStanding({ provider: "site_extractor", confirmed_by: "person", member_confirmed: true })).toBe("member_confirmed");
  });

  it("una pista sin confirmar, o sin procedencia: abierta (puede no trabajar aquí)", () => {
    expect(notThemStanding({ provider: "site_extractor", confirmed_by: null, member_confirmed: false })).toBe("open");
    expect(notThemStanding({ provider: null, confirmed_by: null, member_confirmed: false })).toBe("open");
  });
});
