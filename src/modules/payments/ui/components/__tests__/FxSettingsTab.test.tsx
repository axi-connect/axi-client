import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

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

const mockShowAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert: mockShowAlert }) }));

import { expectAlertContract } from "@/core/notifications/testing";
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

  it("QA F2: el ejemplo del formulario sale de la tasa EFECTIVA, la misma que la tarjeta; sin tasa, no da cifra", async () => {
    // Con la efectiva del fixture, 3.500 × 3.162,46 = 11.068.610: la misma cifra en las dos columnas.
    render(<FxSettingsTab />);
    expect(await screen.findByText(/≈ \$ 11\.068\.610 a la tasa de hoy/)).toBeInTheDocument();
    expect(screen.getAllByText(/11\.068\.610/)).toHaveLength(2);
    cleanup();
    // Otra tasa, otra cifra: el texto no está escrito a mano
    mockGetLatest.mockResolvedValue({
      ...latest,
      effective: { ...latest.effective!, rate: 3329.68 },
    });
    render(<FxSettingsTab />);
    expect(await screen.findByText(/≈ \$ 11\.653\.880 a la tasa de hoy/)).toBeInTheDocument();
    cleanup();
    mockGetLatest.mockResolvedValue({ official: null, effective: null });
    render(<FxSettingsTab />);
    expect(await screen.findByText(/equivalente en pesos a la tasa del día/)).toBeInTheDocument();
    expect(screen.queryByText(/a la tasa de hoy»/)).not.toBeInTheDocument();
  });

  it("QA F2: una tasa manual guardada y VENCIDA lo dice; una vigente, no", async () => {
    mockGetSettings.mockResolvedValue({
      ...settings,
      manual_rate: { rate: 4000, valid_until: "2026-09-01" },
    });
    render(<FxSettingsTab />);
    const notice = await screen.findByText(/Tu tasa manual venció el/);
    expect(notice).toHaveTextContent(/venció el 01 de sept de 2026/);
    expect(notice.closest("[role=status]")).not.toBeNull();
    expect(screen.getByLabelText("Vigente hasta")).toHaveAttribute("aria-invalid", "true");
    // Al mover la fecha, el aviso se va: ya no describe lo guardado
    fireEvent.change(screen.getByLabelText("Vigente hasta"), { target: { value: "2099-12-31" } });
    expect(screen.queryByText(/venció/)).not.toBeInTheDocument();
    cleanup();
    mockGetSettings.mockResolvedValue({
      ...settings,
      manual_rate: { rate: 4000, valid_until: "2099-12-31" },
    });
    render(<FxSettingsTab />);
    await screen.findByLabelText("Vigente hasta");
    expect(screen.queryByText(/venció/)).not.toBeInTheDocument();
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

  it("§9.4: al fallar el guardado, el título es fijo y el mensaje del servidor va al cuerpo; al guardar, sin autoCloseMs", async () => {
    mockSave.mockRejectedValueOnce(
      new HttpError({
        status: 422,
        code: "fx/qa_probe",
        message: "El ajuste supera el máximo",
        problem: { type: "about:blank", title: "Error", status: 422, code: "fx/qa_probe", detail: "El ajuste supera el máximo" },
      }),
    );
    render(<FxSettingsTab />);
    (await screen.findByRole("button", { name: /Guardar cambios/ })).click();
    await waitFor(() => expect(mockShowAlert).toHaveBeenCalledTimes(1));
    const failure = mockShowAlert.mock.calls[0]?.[0] as { title: string; description: string };
    expect(failure.title).toBe("No se pudo guardar");
    expect(failure.description).toBe("El ajuste supera el máximo");
    expectAlertContract(failure, { serverMessage: "El ajuste supera el máximo" });

    mockSave.mockResolvedValueOnce(settings);
    screen.getByRole("button", { name: /Guardar cambios/ }).click();
    await waitFor(() => expect(mockShowAlert).toHaveBeenCalledTimes(2));
    expect(mockShowAlert.mock.calls[1]?.[0]).toEqual({ tone: "success", title: "Ajustes de moneda guardados" });
    expectAlertContract(mockShowAlert.mock.calls[1]?.[0]);
  });
});
