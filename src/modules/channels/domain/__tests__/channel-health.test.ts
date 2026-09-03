import type { ChannelDTO } from "../channel";
import {
  DELETE_CONFIRMATION,
  readChannelActions,
  readConnectionMethod,
  readLastCheck,
  readMessagingLimit,
  readMetaAccess,
  readOnboardingNotice,
  readQualityRating,
} from "../channel-health";

/**
 * Estas funciones existen para que ningún enum de Meta llegue a la pantalla. El
 * test asserta las dos propiedades de las que depende esa promesa:
 *
 *  - **nada crudo se filtra** (`GREEN`, `TIER_1K`, `awaiting_registration`),
 *  - **nada ausente se inventa**: `null` es "Sin datos", nunca un valor plausible.
 *    En una pantalla de salud un dato falso es peor que un hueco.
 */
const NOW = new Date("2026-08-09T12:00:00.000Z");

function channel(overrides: Partial<ChannelDTO> = {}): ChannelDTO {
  return {
    id: "ch-1",
    name: "Ventas",
    kind: "whatsapp_cloud",
    provider_account_id: "555000111222",
    status: "connected",
    credentials_configured: true,
    credentials_revoked: false,
    connection_method: "embedded_signup",
    token_expires_at: null,
    ...overrides,
  } as ChannelDTO;
}

describe("readQualityRating", () => {
  it("traduce los tres tonos de Meta a palabras del producto", () => {
    expect(readQualityRating("GREEN")).toMatchObject({ label: "Alta", tone: "good" });
    expect(readQualityRating("YELLOW")).toMatchObject({ label: "Media", tone: "warning" });
    expect(readQualityRating("RED")).toMatchObject({ label: "Baja", tone: "bad" });
  });

  it("acepta también el vocabulario del webhook de marcado", () => {
    // El backend normaliza FLAGGED/UNFLAGGED a RED/GREEN antes de guardar, pero
    // una fila anterior a esa normalización mostraría "Sin datos" justo cuando
    // Meta marca el número: el único momento en que esta tarjeta importa
    expect(readQualityRating("FLAGGED")).toMatchObject({ label: "Baja", tone: "bad" });
    expect(readQualityRating("UNFLAGGED")).toMatchObject({ label: "Alta", tone: "good" });
  });

  it("sin dato dice «Sin datos», no un valor plausible", () => {
    for (const value of [null, undefined, "", "UNKNOWN", "ALGO_RARO"]) {
      expect(readQualityRating(value).label).toBe("Sin datos");
      expect(readQualityRating(value).tone).toBe("neutral");
    }
  });

  it("explica qué hacer: un indicador sin acción posible es ruido", () => {
    expect(readQualityRating("RED").hint).toMatch(/bloqueos y los reportes/i);
  });
});

describe("readMessagingLimit", () => {
  it("habla de personas, no de tiers", () => {
    expect(readMessagingLimit("TIER_1K").label).toBe("1.000 personas nuevas al día");
    expect(readMessagingLimit("TIER_10K").label).toBe("10.000 personas nuevas al día");
    expect(readMessagingLimit("TIER_250").label).toBe("250 personas nuevas al día");
    expect(readMessagingLimit("TIER_UNLIMITED").label).toBe("Sin límite");
  });

  it("lee el número del propio valor: un tier nuevo de Meta no lo rompe", () => {
    // Una tabla fija se queda corta cada vez que Meta añade un escalón, y el
    // fallo sería silencioso: "Sin datos" en un canal perfectamente sano
    expect(readMessagingLimit("TIER_100K").label).toBe("100.000 personas nuevas al día");
    expect(readMessagingLimit("TIER_2M").label).toBe("2.000.000 personas nuevas al día");
  });

  it("el escalón más bajo se marca como aviso", () => {
    expect(readMessagingLimit("TIER_250").tone).toBe("warning");
    expect(readMessagingLimit("TIER_1K").tone).toBe("good");
  });

  it("sin dato dice «Sin datos»", () => {
    expect(readMessagingLimit(null).label).toBe("Sin datos");
    expect(readMessagingLimit("").label).toBe("Sin datos");
  });
});

describe("readMetaAccess", () => {
  it("un token revocado manda sobre la fecha de caducidad", () => {
    // Revocar a mano en el Administrador comercial deja `expires_at` en el
    // futuro: mostrar "Vigente" ahí sería mentir en la única línea que explica
    // por qué no se pueden enviar mensajes
    const reading = readMetaAccess(
      channel({
        credentials_revoked: true,
        token_expires_at: "2027-01-01T00:00:00.000Z",
      }),
      NOW,
    );

    expect(reading).toMatchObject({ label: "Revocado por Meta", tone: "bad" });
  });

  it("avisa en la última semana antes de caducar", () => {
    expect(
      readMetaAccess(channel({ token_expires_at: "2026-08-12T12:00:00.000Z" }), NOW),
    ).toMatchObject({ label: "Caduca en 3 días", tone: "warning" });
    expect(
      readMetaAccess(channel({ token_expires_at: "2026-08-09T20:00:00.000Z" }), NOW),
    ).toMatchObject({ label: "Caduca hoy", tone: "warning" });
  });

  it("ya caducado es un fallo, no un aviso", () => {
    expect(
      readMetaAccess(channel({ token_expires_at: "2026-08-01T00:00:00.000Z" }), NOW),
    ).toMatchObject({ label: "Caducado", tone: "bad" });
  });

  it("con margen suficiente dice vigente y cuándo caduca", () => {
    const reading = readMetaAccess(channel({ token_expires_at: "2026-10-09T12:00:00.000Z" }), NOW);
    expect(reading).toMatchObject({ label: "Vigente", tone: "good" });
    expect(reading.hint).toMatch(/Caduca en 61 días/);
  });

  it("un canal sin credenciales no dice «Vigente»", () => {
    expect(readMetaAccess(channel({ credentials_configured: false }), NOW)).toMatchObject({
      label: "Sin configurar",
      tone: "warning",
    });
  });
});

describe("readConnectionMethod", () => {
  it("traduce los tres métodos", () => {
    expect(readConnectionMethod("embedded_signup")).toBe("Con un botón");
    expect(readConnectionMethod("qr_pairing")).toBe("Con código QR (canal retirado)");
    expect(readConnectionMethod("manual_token")).toBe("Credenciales pegadas a mano");
  });
});

describe("readOnboardingNotice", () => {
  it("no devuelve nada cuando el alta terminó bien", () => {
    // Un banner permanente que dice "todo bien" enseña a ignorar los banners
    expect(readOnboardingNotice("completed")).toBeNull();
    expect(readOnboardingNotice(null)).toBeNull();
    expect(readOnboardingNotice(undefined)).toBeNull();
  });

  it("cada sub-estado pendiente explica la consecuencia y la salida", () => {
    const pin = readOnboardingNotice("awaiting_registration");
    expect(pin?.title).toMatch(/PIN/);
    expect(pin?.detail).toMatch(/ya recibe mensajes/i);

    const payment = readOnboardingNotice("awaiting_payment_method");
    expect(payment?.detail).toMatch(/Administrador de WhatsApp/);

    expect(readOnboardingNotice("failed")?.title).toMatch(/no terminó bien/i);
  });

  it("ningún aviso filtra el valor crudo del sub-estado", () => {
    for (const status of ["awaiting_registration", "awaiting_payment_method", "failed"]) {
      const notice = readOnboardingNotice(status);
      expect(JSON.stringify(notice)).not.toMatch(/awaiting_|failed/);
    }
  });
});

describe("readLastCheck", () => {
  it("sin comprobación previa no inventa una fecha", () => {
    expect(readLastCheck(null, NOW)).toBe("Sin datos");
  });

  it("redacta el tiempo transcurrido en singular y plural", () => {
    expect(readLastCheck("2026-08-09T11:59:30.000Z", NOW)).toBe("hace unos segundos");
    expect(readLastCheck("2026-08-09T11:59:00.000Z", NOW)).toBe("hace 1 minuto");
    expect(readLastCheck("2026-08-09T11:48:00.000Z", NOW)).toBe("hace 12 minutos");
    expect(readLastCheck("2026-08-09T09:00:00.000Z", NOW)).toBe("hace 3 horas");
    expect(readLastCheck("2026-08-07T12:00:00.000Z", NOW)).toBe("hace 2 días");
  });
});

describe("readChannelActions — las acciones del detalle (F6)", () => {
  function channel(overrides: Partial<ChannelDTO> = {}): ChannelDTO {
    return {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Ventas",
      kind: "whatsapp_cloud",
      provider_account_id: "111",
      status: "connected",
      display_phone_number: null,
      verified_name: null,
      waba_id: null,
      default_ai_agent_id: null,
      credentials_configured: true,
      token_last4: null,
      quality_rating: null,
      messaging_limit: null,
      last_health_check_at: null,
      token_expires_at: null,
      credentials_revoked: false,
      disconnected_at: null,
      business_id: null,
      connection_method: "embedded_signup",
      onboarding: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      ...overrides,
    } as ChannelDTO;
  }

  it("un canal activo ofrece desconectar y promete que no se pierde nada", () => {
    const actions = readChannelActions(channel());

    expect(actions.can_disconnect).toBe(true);
    expect(actions.can_reconnect).toBe(false);
    // Sin esta promesa explícita, nadie pulsa un botón que suena a apagar
    expect(actions.hint).toContain("sin borrarlo");
  });

  it("desconectado por el tenant: lo dice con fecha, no como una avería", () => {
    const actions = readChannelActions(
      channel({ status: "disconnected", disconnected_at: "2026-08-03T10:00:00.000Z" }),
      new Date("2026-08-18T00:00:00.000Z"),
    );

    expect(actions.can_disconnect).toBe(false);
    expect(actions.can_reconnect).toBe(true);
    expect(actions.hint).toContain("Lo desconectaste el 3 de agosto");
  });

  it("revocado por Meta: mensaje distinto, porque es una situación distinta", () => {
    const actions = readChannelActions(
      channel({ status: "disconnected", credentials_revoked: true }),
    );

    expect(actions.hint).toContain("Meta revocó el acceso");
    expect(actions.hint).not.toContain("Lo desconectaste");
  });

  it("Instagram y Messenger también se reconectan: antes un IG revocado solo ofrecía «Eliminar»", () => {
    // `can_reconnect` era `isCloud`, coherente cuando no tenían alta por botón.
    // Desde F7 la tienen, y reconectar es relanzarla.
    for (const kind of ["instagram_dm", "facebook_messenger"] as const) {
      const actions = readChannelActions(channel({ kind, status: "disconnected", credentials_revoked: true }));
      expect(actions.can_reconnect).toBe(true);
    }
    // El simulador no tiene producto de Meta: nada que relanzar
    expect(readChannelActions(channel({ kind: "simulator", status: "disconnected" })).can_reconnect).toBe(false);
  });

  it("con el número sin PIN ofrece confirmarlo: la salida del bucle «renovar → sigue sin PIN»", () => {
    // Antes la única acción era renovar la conexión, que devolvía el mismo
    // sub-estado. El canal recibía y no podía iniciar conversaciones, y no había
    // ningún sitio en el producto donde teclear el PIN.
    const actions = readChannelActions(
      channel({
        onboarding: { status: "awaiting_registration", method: null, attempted_at: null, last_error_code: null },
      }),
    );

    expect(actions.can_register_pin).toBe(true);
    expect(actions.can_disconnect).toBe(true);
  });

  it("el PIN no se ofrece en un canal desconectado ni en uno ya registrado", () => {
    expect(
      readChannelActions(
        channel({
          status: "disconnected",
          onboarding: { status: "awaiting_registration", method: null, attempted_at: null, last_error_code: null },
        }),
      ).can_register_pin,
    ).toBe(false);
    expect(readChannelActions(channel()).can_register_pin).toBe(false);
  });

  it("un canal viejo sin fecha no inventa una", () => {
    // Los canales anteriores a B10 no tienen `disconnected_at`
    const actions = readChannelActions(channel({ status: "disconnected" }));

    expect(actions.hint).toContain("está desconectado");
    expect(actions.hint).not.toContain("Invalid Date");
  });

  it("«este número» solo en WhatsApp: en Instagram y Messenger se elimina un canal", () => {
    expect(readChannelActions(channel()).hint).toContain("este número deja de recibir");
    expect(readChannelActions(channel({ kind: "instagram_dm" })).hint).toContain("este canal deja de recibir");
    expect(readChannelActions(channel({ kind: "facebook_messenger" })).hint).not.toContain("número");
  });

  it("la confirmación de borrado nombra el canal y promete lo mismo en todas las superficies", () => {
    expect(DELETE_CONFIRMATION.title).toBe("Eliminar canal");
    const text = DELETE_CONFIRMATION.describe("Ventas");
    expect(text).toContain("“Ventas”");
    expect(text).toContain("las conversaciones quedan archivadas");
  });
})
