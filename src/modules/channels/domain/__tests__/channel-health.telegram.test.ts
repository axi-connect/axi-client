import type { ChannelDTO } from "../channel";
import {
  describeTelegramError,
  readChannelActions,
  readConnectionMethod,
  readTelegramReception,
} from "../channel-health";
import { channelProvider, signupFlavor } from "../channel-providers";

const NOW = new Date("2026-10-12T15:00:00.000Z");

const TELEGRAM = {
  username: "donjoao_pruebas_bot",
  link: "https://t.me/donjoao_pruebas_bot",
  transport: "webhook" as const,
  pending_updates: 0,
  last_error_at: null,
  last_error: null,
  foreign_webhook: false,
};

function bot(overrides: Partial<ChannelDTO> = {}): ChannelDTO {
  return {
    id: "ch-tg",
    name: "Telegram · Pruebas",
    kind: "telegram",
    provider_account_id: "7712406623",
    status: "connected",
    credentials_configured: true,
    credentials_revoked: false,
    connection_method: "bot_token",
    token_expires_at: null,
    telegram: TELEGRAM,
    ...overrides,
  } as ChannelDTO;
}

describe("canal Telegram", () => {
  it("se conecta por el paso del token, no por Meta", () => {
    const provider = channelProvider("telegram");
    expect(signupFlavor(provider)).toBe("telegram");
    expect(provider.meta_product).toBeUndefined();
  });

  it("la forma de conexión se lee sin jerga", () => {
    expect(readConnectionMethod("bot_token")).toBe("Token de @BotFather");
  });

  describe("readTelegramReception", () => {
    it("recibiendo cuando no hay errores", () => {
      expect(readTelegramReception(bot(), NOW)).toMatchObject({ label: "Recibiendo", tone: "good" });
    });

    it("un error de entrega reciente es aviso, no fallo", () => {
      const reading = readTelegramReception(
        bot({
          telegram: {
            ...TELEGRAM,
            last_error_at: "2026-10-12T08:10:00.000Z",
            last_error: "Connection timed out",
          },
        }),
        NOW,
      );
      expect(reading).toMatchObject({ label: "Telegram no nos alcanzaba", tone: "warning" });
      // El error de Telegram llega en inglés: se muestra traducido, sin jerga
      expect(reading.hint).not.toContain("Connection timed out");
      expect(reading.hint).toContain("nuestro servidor tardó en responder");
      expect(reading.hint).not.toContain("llegan completos");
    });

    it("otra herramienta con el bot es fallo y dice cómo recuperarlo", () => {
      const reading = readTelegramReception(bot({ telegram: { ...TELEGRAM, foreign_webhook: true } }), NOW);
      expect(reading).toMatchObject({ label: "Otra herramienta recibe los mensajes", tone: "bad" });
      expect(reading.hint).toContain("Rotar token");
    });

    it("un error viejo ya no se muestra", () => {
      const reading = readTelegramReception(
        bot({ telegram: { ...TELEGRAM, last_error_at: "2026-10-10T08:10:00.000Z", last_error: "x" } }),
        NOW,
      );
      expect(reading.label).toBe("Recibiendo");
    });

    it("token revocado manda sobre todo lo demás", () => {
      expect(readTelegramReception(bot({ credentials_revoked: true }), NOW)).toMatchObject({
        label: "El token ya no sirve",
        tone: "bad",
      });
    });

    it("desconectado no recibe", () => {
      expect(readTelegramReception(bot({ status: "disconnected" }), NOW).label).toBe("Detenida");
    });
  });

  it("un bot desconectado se reconecta pegando el token otra vez", () => {
    const actions = readChannelActions(bot({ status: "disconnected" }), NOW);
    expect(actions.can_reconnect).toBe(true);
  });

  it("el texto de acciones habla de rotar el token, no de Meta", () => {
    expect(readChannelActions(bot(), NOW).hint).toContain("Rotar token");
  });
});

describe("describeTelegramError", () => {
  it.each([
    ["Connection timed out", "nuestro servidor tardó en responder"],
    ["Wrong response from the webhook: 401 Unauthorized", "desajuste de seguridad"],
    ["Wrong response from the webhook: 502 Bad Gateway", "falla momentánea"],
    ["Failed to resolve host: Name or service not known", "no pudo conectarse"],
    [null, "no pudo entregarnos algunos mensajes"],
  ])("«%s» se dice sin jerga", (raw, expected) => {
    expect(describeTelegramError(raw)).toContain(expected);
  });
});
