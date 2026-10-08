import type { CmoSettingsDTO } from "@/modules/cmo/domain/cmo";
import { useCmoStore } from "../cmo.store";

/**
 * El interruptor de Axel visto desde fuera de /cmo.
 *
 * La isla de la cabecera lo necesita en cualquier pantalla, así que la carga es
 * PEREZOSA: una vez por sesión y nunca más, porque repetirla en cada navegación
 * sería una petición por pantalla para un dato que casi nunca cambia.
 */

jest.mock("@/modules/cmo/infrastructure/services/cmo-service.adapter", () => ({
  sendMessage: jest.fn(),
  listThreads: jest.fn(),
  archiveThread: jest.fn(),
  getTranscript: jest.fn(),
  listProposals: jest.fn(),
  getProposal: jest.fn(),
  approveProposal: jest.fn(),
  rejectProposal: jest.fn(),
  getCmoSettings: jest.fn(),
  getLatestBriefing: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require("@/modules/cmo/infrastructure/services/cmo-service.adapter") as {
  getCmoSettings: jest.Mock;
};

const SETTINGS: CmoSettingsDTO = {
  enabled: true,
  briefing_hour: 8,
  proposal_cap: 5,
  limits: { max_discount_percent: 20, max_audience: 2000 },
  notify: { in_app: true },
  turn_timeout_ms: 120_000,
};

beforeEach(() => {
  jest.clearAllMocks();
  useCmoStore.setState({ settings: { status: "idle", data: null, error: null } });
  api.getCmoSettings.mockResolvedValue(SETTINGS);
});

describe("ensureSettings", () => {
  it("pregunta una vez y deja el interruptor listo", async () => {
    await useCmoStore.getState().ensureSettings();

    expect(api.getCmoSettings).toHaveBeenCalledTimes(1);
    expect(useCmoStore.getState().settings.status).toBe("ready");
    expect(useCmoStore.getState().settings.data?.enabled).toBe(true);
  });

  it("no repite la petición en cada navegación", async () => {
    await useCmoStore.getState().ensureSettings();
    await useCmoStore.getState().ensureSettings();
    await useCmoStore.getState().ensureSettings();

    expect(api.getCmoSettings).toHaveBeenCalledTimes(1);
  });

  it("tampoco la repite si falló: con error se falla abierta, no se reintenta en bucle", async () => {
    api.getCmoSettings.mockRejectedValue(new Error("sin red"));

    await useCmoStore.getState().ensureSettings();
    await useCmoStore.getState().ensureSettings();

    expect(api.getCmoSettings).toHaveBeenCalledTimes(1);
    expect(useCmoStore.getState().settings.status).toBe("error");
  });

  it("dos llamadas a la vez son una sola petición", async () => {
    await Promise.all([useCmoStore.getState().ensureSettings(), useCmoStore.getState().ensureSettings()]);

    expect(api.getCmoSettings).toHaveBeenCalledTimes(1);
  });
});

describe("noteSettings", () => {
  it("adopta los ajustes recién guardados: encender en /cmo/settings se nota fuera", () => {
    useCmoStore.getState().noteSettings({ ...SETTINGS, enabled: false });
    expect(useCmoStore.getState().settings.data?.enabled).toBe(false);

    useCmoStore.getState().noteSettings(SETTINGS);
    expect(useCmoStore.getState().settings.status).toBe("ready");
    expect(useCmoStore.getState().settings.data?.enabled).toBe(true);
  });
});
