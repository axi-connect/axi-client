import { render, screen, waitFor } from "@testing-library/react";

import { HttpError } from "@/core/api/problem";
import type { FxSettingsDTO, LatestFxRateDTO } from "@/modules/payments/domain/fx-settings";

const mockGetSettings = jest.fn<Promise<FxSettingsDTO>, []>();
const mockGetLatest = jest.fn<Promise<LatestFxRateDTO>, []>();
const mockSave = jest.fn<Promise<FxSettingsDTO>, [FxSettingsDTO]>();
jest.mock("@/modules/payments/infrastructure/services/fx-service.adapter", () => ({
  getFxSettings: () => mockGetSettings(),
  getLatestFxRate: () => mockGetLatest(),
  saveFxSettings: (next: FxSettingsDTO) => mockSave(next),
}));

jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert: jest.fn() }) }));

import { FxSettingsTab } from "@/modules/payments/ui/components/FxSettingsTab";

const settings: FxSettingsDTO = {
  settlement_currency: "COP",
  spread_bps: 200,
  manual_rate: null,
  show_indicative_quotes: true,
};

const latest: LatestFxRateDTO = {
  official: {
    base: "USD",
    quote: "COP",
    rate: 3100.45,
    valid_from: "2026-09-16",
    valid_to: "2026-09-16",
    source: "superfinanciera",
    fetched_at: "2026-09-15T23:35:00.000Z",
  },
  effective: {
    base: "USD",
    quote: "COP",
    rate: 3162.46,
    official_rate: 3100.45,
    spread_bps: 200,
    source: "superfinanciera",
    valid_from: "2026-09-16",
    stale: false,
  },
};

/** El error tipado que lanza el HttpClient ante un 403 del backend. */
function problem(code: string, status = 403): HttpError {
  return new HttpError({ status, code, message: "Prohibido" });
}

describe("FxSettingsTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSettings.mockResolvedValue(settings);
    mockGetLatest.mockResolvedValue(latest);
  });

  it("muestra la TRM oficial, la efectiva con el ajuste y un ejemplo en pesos", async () => {
    render(<FxSettingsTab />);

    expect(await screen.findByText("$ 3.100,45")).toBeInTheDocument();
    expect(screen.getByText("$ 3.162,46")).toBeInTheDocument();
    expect(screen.getByText(/Un paquete de/)).toBeInTheDocument();
  });

  it("sin la función explica cómo encenderla en vez de romper", async () => {
    mockGetSettings.mockRejectedValue(problem("features/feature_disabled"));
    render(<FxSettingsTab />);

    expect(await screen.findByText(/Esta función está apagada/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ir a Funciones/ })).toHaveAttribute(
      "href",
      "/settings/company/funciones",
    );
    expect(screen.getByText(/fx_quotes/)).toBeInTheDocument();
  });

  it("sin la capacidad del plan el mensaje es otro: no es una función apagada", async () => {
    mockGetSettings.mockRejectedValue(problem("entitlements/capability_not_granted"));
    render(<FxSettingsTab />);

    expect(await screen.findByText(/Tu plan no incluye/)).toBeInTheDocument();
    expect(screen.queryByText(/Esta función está apagada/)).toBeNull();
  });

  it("cuando la serie está vacía lo dice y ofrece la tasa manual", async () => {
    mockGetLatest.mockResolvedValue({ official: null, effective: null });
    render(<FxSettingsTab />);

    expect(await screen.findByText(/Aún no hay TRM publicada/)).toBeInTheDocument();
  });

  it("una oficial vencida se usa avisando, no en silencio", async () => {
    mockGetLatest.mockResolvedValue({
      official: { ...latest.official!, valid_from: "2026-09-11", valid_to: "2026-09-13" },
      effective: { ...latest.effective!, stale: true },
    });
    render(<FxSettingsTab />);

    expect(await screen.findByText(/La fuente oficial no publicó los últimos días/)).toBeInTheDocument();
  });

  it("mientras carga no pinta la tarjeta a medias", () => {
    render(<FxSettingsTab />);
    expect(screen.getByRole("status", { name: /Cargando moneda y TRM/ })).toBeInTheDocument();
  });

  it("guardar manda los cuatro campos juntos y repinta con lo que devuelve el servidor", async () => {
    const saved: FxSettingsDTO = { ...settings, spread_bps: 300 };
    mockSave.mockResolvedValue(saved);
    render(<FxSettingsTab />);

    const form = await screen.findByRole("button", { name: /Guardar cambios/ });
    form.click();

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith({
        settlement_currency: "COP",
        spread_bps: 200,
        manual_rate: null,
        show_indicative_quotes: true,
      });
    });
  });
});
