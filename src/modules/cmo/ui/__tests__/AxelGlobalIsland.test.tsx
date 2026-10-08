import { act, render, screen } from "@testing-library/react";

import type { CmoSettingsDTO } from "@/modules/cmo/domain/cmo";
import { useCmoStore } from "@/modules/cmo/infrastructure/stores/cmo.store";
import { AxelGlobalIsland } from "../components/AxelGlobalIsland";

/**
 * La isla de Axel en la cabecera (island-live F4b): en /cmo no se monta (un solo
 * Axel vivo), sin permiso no existe, con Axel apagado tampoco, y una novedad del
 * socket se avisa en cualquier pantalla.
 */

let pathname = "/dashboard";
const push = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push }),
}));

let allowed = true;
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: (code: string) => allowed && code === "cmo:read" }),
}));

jest.mock("@/core/realtime/use-socket", () => ({
  useSocket: () => ({ socket: null, connected: false }),
  useSocketEvent: () => undefined,
}));

jest.mock("@/modules/cmo/infrastructure/services/cmo-service.adapter", () => ({
  getCmoSettings: jest.fn(),
  getLatestBriefing: jest.fn(() => Promise.resolve(null)),
  listProposals: jest.fn(() => Promise.resolve([])),
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

/** Axel ya consultado: es el estado del que parten los casos que no hablan del interruptor. */
const known = (enabled: boolean) => ({
  settings: { status: "ready" as const, data: { ...SETTINGS, enabled }, error: null },
});

/** Nadie ha preguntado todavía por el interruptor. */
const unknown = () => ({ settings: { status: "idle" as const, data: null, error: null } });

beforeEach(() => {
  jest.clearAllMocks();
  pathname = "/dashboard";
  allowed = true;
  push.mockClear();
  api.getCmoSettings.mockResolvedValue(SETTINGS);
  useCmoStore.setState({ news: [], ...known(true) });
});

describe("AxelGlobalIsland", () => {
  it("fuera de /cmo es la píldora de Axel, y tocarla abre el despacho", () => {
    render(<AxelGlobalIsland />);
    screen.getByRole("button", { name: "Abrir Axel" }).click();
    expect(push).toHaveBeenCalledWith("/cmo");
  });

  it("en /cmo no se monta: allí vive el Axel del chat", () => {
    pathname = "/cmo/proposals/p1";
    const { container } = render(<AxelGlobalIsland />);
    expect(container).toBeEmptyDOMElement();
  });

  it("sin permiso de Axel no existe", () => {
    allowed = false;
    const { container } = render(<AxelGlobalIsland />);
    expect(container).toBeEmptyDOMElement();
  });

  it("con Axel apagado no existe: su interruptor manda en toda la plataforma", () => {
    useCmoStore.setState(known(false));
    const { container } = render(<AxelGlobalIsland />);
    expect(container).toBeEmptyDOMElement();
  });

  it("mientras no se sabe si está encendido no se pinta: la isla no parpadea", () => {
    useCmoStore.setState(unknown());
    api.getCmoSettings.mockReturnValue(new Promise(() => undefined));
    const { container } = render(<AxelGlobalIsland />);
    expect(container).toBeEmptyDOMElement();
    expect(api.getCmoSettings).toHaveBeenCalledTimes(1);
  });

  it("si los ajustes no se pueden leer, la isla se queda: falla abierta", async () => {
    useCmoStore.setState(unknown());
    api.getCmoSettings.mockRejectedValue(new Error("sin red"));
    render(<AxelGlobalIsland />);
    expect(await screen.findByRole("button", { name: "Abrir Axel" })).toBeInTheDocument();
  });

  it("aparece sola en cuanto se sabe que está encendido", async () => {
    useCmoStore.setState(unknown());
    render(<AxelGlobalIsland />);
    expect(await screen.findByRole("button", { name: "Abrir Axel" })).toBeInTheDocument();
  });

  it("en /cmo o sin permiso ni siquiera pregunta por el interruptor", () => {
    useCmoStore.setState(unknown());
    pathname = "/cmo";
    render(<AxelGlobalIsland />);
    pathname = "/dashboard";
    allowed = false;
    render(<AxelGlobalIsland />);
    expect(api.getCmoSettings).not.toHaveBeenCalled();
  });

  it("una propuesta nueva se avisa en cualquier pantalla y «Ver» la abre", () => {
    render(<AxelGlobalIsland />);
    act(() => {
      useCmoStore.getState().noteProposalCreated({
        company_id: "c1",
        proposal_id: "p1",
        kind: "campaign",
        title: "Subir el presupuesto",
        source: "signal",
        expires_at: null,
      });
    });
    expect(screen.getByRole("status")).toHaveTextContent("Nueva propuesta. Subir el presupuesto");
    screen.getByRole("button", { name: "Ver" }).click();
    expect(push).toHaveBeenCalledWith("/cmo/proposals/p1");
  });
});
