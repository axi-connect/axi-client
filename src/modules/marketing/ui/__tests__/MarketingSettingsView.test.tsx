import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  DEFAULT_MARKETING_SETTINGS,
  type MarketingSettings,
} from "@/modules/marketing/domain/settings";
import { MarketingSettingsView } from "../MarketingSettingsView";

/**
 * Agrupados por escenario (ver `PromotionsView.test.tsx`). Lo que se comprueba
 * aquí es lo que NO puede vivir en el dominio: que el PUT reenvía la sección
 * completa, que no se ofrece guardar sin haber podido cargar, y que un valor
 * inválido no llega al servidor.
 */

jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal: jest.fn(), closeModal: jest.fn() }),
}));

jest.mock("@/modules/marketing/infrastructure/services/settings-service.adapter", () => ({
  getMarketingSettings: jest.fn(),
  putMarketingSettings: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require("@/modules/marketing/infrastructure/services/settings-service.adapter") as {
  getMarketingSettings: jest.Mock;
  putMarketingSettings: jest.Mock;
};

const SAVED: MarketingSettings = {
  ...DEFAULT_MARKETING_SETTINGS,
  cooldown_hours: 12,
  opt_out: { ...DEFAULT_MARKETING_SETTINGS.opt_out, keywords: ["BAJA", "STOP"] },
};

beforeEach(() => jest.clearAllMocks());
afterEach(cleanup);

describe("ajustes cargados", () => {
  beforeEach(async () => {
    api.getMarketingSettings.mockResolvedValue(SAVED);
    api.putMarketingSettings.mockImplementation((s: MarketingSettings) => Promise.resolve(s));
    render(<MarketingSettingsView />);
    await screen.findByLabelText("Horas entre mensajes al mismo contacto");
  });

  it("parte de lo que devuelve el servidor y no ofrece guardar sin cambios", () => {
    expect(screen.getByLabelText("Horas entre mensajes al mismo contacto")).toHaveValue(12);
    expect(screen.getByRole("button", { name: "Guardar configuración" })).toBeDisabled();
    expect(screen.queryByText("Tienes cambios sin guardar")).not.toBeInTheDocument();
  });

  it("traduce el ritmo de WhatsApp Web a algo que se entiende", () => {
    // 30 s con 50% de jitter → ~96 mensajes/hora, 1,6 h para agotar 150.
    expect(screen.getByText(/96 mensajes por hora/)).toBeInTheDocument();
    expect(screen.getByText(/cerca de 1.6 horas/)).toBeInTheDocument();
  });

  it("guarda la sección COMPLETA, no un parche", async () => {
    const field = screen.getByLabelText("Horas entre mensajes al mismo contacto");
    fireEvent.change(field, { target: { value: "48" } });
    expect(screen.getByText("Tienes cambios sin guardar")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Guardar configuración" }));

    await waitFor(() => expect(api.putMarketingSettings).toHaveBeenCalled());
    const sent = api.putMarketingSettings.mock.calls[0][0] as MarketingSettings;
    // El PUT exige todas las claves: un parche borraría las que no viajen.
    expect(Object.keys(sent).sort()).toEqual(Object.keys(DEFAULT_MARKETING_SETTINGS).sort());
    expect(sent.cooldown_hours).toBe(48);
    expect(sent.wweb).toEqual(SAVED.wweb);
  });

  it("un valor fuera de rango se señala en su campo y NO llega al servidor", async () => {
    fireEvent.change(screen.getByLabelText("Máximo de mensajes por contacto al día"), {
      target: { value: "99" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar configuración" }));

    expect(await screen.findByText("Entre 1 y 10 mensajes")).toBeInTheDocument();
    expect(api.putMarketingSettings).not.toHaveBeenCalled();
    expect(showAlert).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Revisa los campos marcados" }),
    );
  });

  it("descartar vuelve a pedir los ajustes al servidor", async () => {
    fireEvent.change(screen.getByLabelText("Horas entre mensajes al mismo contacto"), {
      target: { value: "48" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Descartar cambios" }));

    await waitFor(() => expect(api.getMarketingSettings).toHaveBeenCalledTimes(2));
  });
});

describe("ajustes que no cargan", () => {
  it("no ofrece guardar sobre defaults inventados: pisaría la configuración real", async () => {
    api.getMarketingSettings.mockRejectedValue(new Error("Se cayó la conexión"));
    render(<MarketingSettingsView />);

    expect(await screen.findByText("Se cayó la conexión")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar configuración" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(api.getMarketingSettings).toHaveBeenCalledTimes(2));
  });
});
