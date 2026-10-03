import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HttpError } from "@/core/api/problem";
import type { PilotsSummaryDTO } from "@/modules/autopilot/domain/summary";
import { PilotsSummaryCard } from "../PilotsSummaryCard";

/**
 * La ficha «Lo que trajeron los pilotos» (P6b): con datos pinta el mes, el
 * embudo, los créditos y la fuente más barata; sin pilotos invita a crear uno;
 * sin permiso o con el servidor aún sin piloto (404) no pinta nada; un error
 * ofrece reintentar.
 */

const hasPermission = jest.fn(() => true);
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission }),
}));
jest.mock("@/shared/auth/entitlements.hooks", () => ({
  useEntitlements: () => ({ loaded: true, hasCapability: () => true }),
}));
jest.mock("@/modules/autopilot/infrastructure/summary-service.adapter", () => ({
  getPilotsSummary: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require("@/modules/autopilot/infrastructure/summary-service.adapter") as { getPilotsSummary: jest.Mock };

const SUMMARY: PilotsSummaryDTO = {
  month: "2026-09",
  has_routines: true,
  demos: 4,
  demos_previous: 2,
  funnel: { found: 212, qualified: 64, contacted: 41, replied: 9, demo: 4 },
  credits_month: 56,
  credits_budget_month: 500,
  credits_per_demo: 14,
  best_sources: [
    { source: "apollo_people", credits_per_demo: 11 },
    { source: "google_places", credits_per_demo: 32 },
  ],
};

afterEach(() => {
  jest.clearAllMocks();
  hasPermission.mockReturnValue(true);
});

describe("PilotsSummaryCard", () => {
  it("con datos: el mes, las demos frente al mes anterior, el embudo, los créditos y la fuente más barata", async () => {
    api.getPilotsSummary.mockResolvedValue(SUMMARY);
    render(<PilotsSummaryCard />);
    expect(await screen.findByText("Lo que trajeron tus pilotos · septiembre")).toBeInTheDocument();
    expect(screen.getByText("demos agendadas").parentElement).toHaveTextContent(/^4demos agendadas/);
    expect(screen.getByText("+2 vs. agosto")).toBeInTheDocument();
    const funnel = screen.getByRole("list", { name: "Embudo del mes" });
    expect(funnel).toHaveTextContent("Encontradas212");
    expect(funnel).toHaveTextContent("Demos4");
    expect(screen.getByText("56 de 500")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver pilotos/ })).toHaveAttribute("href", "/marketing/autopilot");
    expect(screen.getByText(/trae demos a 11 créditos/)).toHaveTextContent(/, a 32\./);
  });

  it("sin pilotos invita a crear el primero", async () => {
    api.getPilotsSummary.mockResolvedValue({ ...SUMMARY, has_routines: false, best_sources: [] });
    render(<PilotsSummaryCard />);
    expect(await screen.findByText("Aún no tienes pilotos")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Crear un piloto" })).toHaveAttribute("href", "/marketing/autopilot/new");
  });

  it("sin permiso de captación no pide nada ni pinta nada", () => {
    hasPermission.mockReturnValue(false);
    const { container } = render(<PilotsSummaryCard />);
    expect(container).toBeEmptyDOMElement();
    expect(api.getPilotsSummary).not.toHaveBeenCalled();
  });

  it("con el servidor aún sin piloto (404) la ficha no se muestra", async () => {
    api.getPilotsSummary.mockRejectedValue(new HttpError({ status: 404, code: "not_found", message: "x" }));
    const { container } = render(<PilotsSummaryCard />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("un error ofrece reintentar y el reintento vuelve a pedir", async () => {
    api.getPilotsSummary.mockRejectedValueOnce(new HttpError({ status: 500, code: "internal", message: "x" }));
    api.getPilotsSummary.mockResolvedValueOnce(SUMMARY);
    render(<PilotsSummaryCard />);
    fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("demos agendadas")).toBeInTheDocument();
    expect(api.getPilotsSummary).toHaveBeenCalledTimes(2);
  });
});
