import { render, screen } from "@testing-library/react";
import { ProviderBalanceBanner } from "../ProviderBalanceBanner";

let mockData: unknown;
jest.mock("../../../infrastructure/api/hooks/use-balances", () => ({
  useBalanceAlertsQuery: () => ({ data: mockData }),
}));

const item = (extra: Record<string, unknown>) => ({
  provider: "openai",
  name: "OpenAI",
  impact: "la IA de todas las empresas está detenida",
  level: "critical",
  reason: "no_funds",
  since: null,
  balance_usd: null,
  ...extra,
});

describe("franja de saldos del panel", () => {
  it("sin crítico no pinta nada (un saldo bajo se ve en Saldos, no en todo el panel)", () => {
    mockData = { level: "warning", items: [item({ level: "warning", reason: "low_balance", balance_usd: 8 })] };
    const { container } = render(<ProviderBalanceBanner />);
    expect(container).toBeEmptyDOMElement();
    mockData = undefined;
    expect(render(<ProviderBalanceBanner />).container).toBeEmptyDOMElement();
  });

  it("con un proveedor sin saldo: qué pasó, qué se detuvo y a dónde ir", () => {
    mockData = {
      level: "critical",
      items: [item({}), item({ provider: "twilio", name: "Twilio", reason: "auth_invalid", impact: "no hay llamadas" })],
    };
    render(<ProviderBalanceBanner />);
    const banner = screen.getByRole("alert");
    expect(banner).toHaveTextContent("OpenAI se quedó sin saldo.");
    expect(banner).toHaveTextContent("Mientras siga así, la IA de todas las empresas está detenida.");
    expect(banner).toHaveTextContent("Y 1 proveedor más en crítico.");
    expect(screen.getByRole("link", { name: "Ver OpenAI" })).toHaveAttribute(
      "href",
      "/platform/balances?proveedor=openai",
    );
  });
});
