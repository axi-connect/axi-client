import { useCaptureStats } from "../capture-stats.store";

jest.mock("../../services/prospecting-service.adapter", () => ({ getProspectingStats: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require("../../services/prospecting-service.adapter") as { getProspectingStats: jest.Mock };

const STATS = { discovered: 1284, quarantined: 876, qualified: 312, promoted: 96, suppressed: 21 };

beforeEach(() => {
  jest.clearAllMocks();
  useCaptureStats.setState({ stats: null });
});

it("promover mueve exactamente dos pasos: sale de la cuarentena y entra al CRM", () => {
  useCaptureStats.getState().seed(STATS);
  useCaptureStats.getState().promoted(2);
  expect(useCaptureStats.getState().stats).toEqual({ ...STATS, quarantined: 874, promoted: 98 });
});

it("sin cifras sembradas, promover no inventa un embudo", () => {
  useCaptureStats.getState().promoted(2);
  expect(useCaptureStats.getState().stats).toBeNull();
});

it("recargar pide las cifras; si falla, conserva las que había", async () => {
  useCaptureStats.getState().seed(STATS);
  api.getProspectingStats.mockRejectedValueOnce(new Error("boom"));
  await useCaptureStats.getState().reload();
  expect(useCaptureStats.getState().stats).toEqual(STATS);

  api.getProspectingStats.mockResolvedValueOnce({ ...STATS, discovered: 1300 });
  await useCaptureStats.getState().reload();
  expect(useCaptureStats.getState().stats?.discovered).toBe(1300);
});
