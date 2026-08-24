import { http } from "@/core/services/http";
import type { CmoSettingsDTO } from "@/modules/cmo/domain/cmo";
import {
  getProposal,
  listProposals,
  saveCmoSettings,
  sendMessage,
} from "../cmo-service.adapter";

/**
 * Las tres formas del contrato que un refactor puede romper sin que tsc lo
 * vea (F15 de la auditoría):
 *
 * - el PUT de settings DESNUDA `turn_timeout_ms` (el schema del backend es
 *   `.strict()`: mandarlo devuelve 400 y nada lo detectaba);
 * - `listProposals` sin status no manda query (pendientes por defecto);
 * - el detalle devuelve `{data: null}` como caso normal, no un 404.
 */

jest.mock("@/core/services/http", () => ({
  http: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mocked = http as jest.Mocked<typeof http>;

const SETTINGS: CmoSettingsDTO = {
  enabled: true,
  briefing_hour: 8,
  proposal_cap: 5,
  limits: { max_discount_percent: 15, max_audience: 150 },
  notify: { in_app: true },
  turn_timeout_ms: 90_000,
} as CmoSettingsDTO;

describe("cmo-service.adapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("saveCmoSettings desnuda turn_timeout_ms: el backend es strict y lo rechazaría", async () => {
    mocked.put.mockResolvedValueOnce(SETTINGS);
    await saveCmoSettings(SETTINGS);
    const [path, body] = mocked.put.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe("/cmo/settings");
    expect("turn_timeout_ms" in body).toBe(false);
    expect(body.limits).toEqual({ max_discount_percent: 15, max_audience: 150 });
  });

  it("listProposals sin status no manda query: pendientes por defecto es contrato", async () => {
    mocked.get.mockResolvedValueOnce({ data: [] });
    await listProposals();
    expect(mocked.get).toHaveBeenCalledWith("/cmo/proposals", {});

    mocked.get.mockResolvedValueOnce({ data: [] });
    await listProposals("approved");
    expect(mocked.get).toHaveBeenCalledWith("/cmo/proposals", { status: "approved" });
  });

  it("getProposal devuelve el null de {data:null} tal cual: vencida no es error", async () => {
    mocked.get.mockResolvedValueOnce({ data: null });
    await expect(getProposal("prop-1")).resolves.toBeNull();
  });

  it("sendMessage propaga la señal de aborto: sin ella un POST colgado piensa para siempre", async () => {
    mocked.post.mockResolvedValueOnce({});
    const controller = new AbortController();
    await sendMessage({ message: "hola" }, controller.signal);
    expect(mocked.post).toHaveBeenCalledWith("/cmo/messages", { message: "hola" }, {
      signal: controller.signal,
    });
  });
});
