import { act, render, screen } from "@testing-library/react";

import { useCmoStore } from "@/modules/cmo/infrastructure/stores/cmo.store";
import { AxelGlobalIsland } from "../components/AxelGlobalIsland";

/**
 * La isla de Axel en la cabecera (island-live F4b): en /cmo no se monta (un solo
 * Axel vivo), sin permiso no existe, y una novedad del socket se avisa en
 * cualquier pantalla.
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
  getLatestBriefing: jest.fn(() => Promise.resolve(null)),
  listProposals: jest.fn(() => Promise.resolve([])),
}));

beforeEach(() => {
  pathname = "/dashboard";
  allowed = true;
  push.mockClear();
  useCmoStore.setState({ news: [] });
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
