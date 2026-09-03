import { act, renderHook, waitFor } from "@testing-library/react";

import { HttpError } from "@/core/api/problem";
import type { ChannelDTO } from "@/modules/channels/domain/channel";
import type { MetaSignupConfigDTO } from "@/modules/channels/domain/meta-signup";
import type { FbLoginOptions, FbLoginResponse } from "../../services/facebook-sdk";

/**
 * La máquina de estados es la pieza con más aristas del módulo: gestos de
 * usuario, `postMessage`, dos fuentes asíncronas en orden no determinista y un
 * `code` que caduca en 30 segundos. Estas pruebas asertan el MECANISMO de los
 * fallos que se pagan caros en producción y que ninguna revisión visual detecta:
 *
 *  - listeners acumulados tras varios montajes → POST duplicados,
 *  - un `origin` atacante aceptado por un `includes("facebook.com")`,
 *  - las dos órdenes de llegada de `code` y `sessionInfo`,
 *  - el `sessionInfo` que no llega nunca.
 */

const getMetaSignupConfig = jest.fn<Promise<MetaSignupConfigDTO | null>, [string]>();
const completeMetaSignup = jest.fn();
const registerMetaPhoneNumber = jest.fn();

jest.mock("../../services/meta-signup.adapter", () => ({
  getMetaSignupConfig: (product: string) => getMetaSignupConfig(product),
  completeMetaSignup: (payload: unknown) => completeMetaSignup(payload),
  registerMetaPhoneNumber: (id: string, pin: string) => registerMetaPhoneNumber(id, pin),
}));

let loginCallback: ((response: FbLoginResponse) => void) | null = null;
let loginOptions: FbLoginOptions | null = null;
const login = jest.fn((cb: (response: FbLoginResponse) => void, options: FbLoginOptions) => {
  loginCallback = cb;
  loginOptions = options;
});
const loadFacebookSdk = jest.fn();
/** El SDK VIVO. Se lee en cada llamada porque Facebook reemplaza window.FB. */
const getFacebookSdk = jest.fn();

jest.mock("../../services/facebook-sdk", () => ({
  loadFacebookSdk: (appId: string | null, version: string) => loadFacebookSdk(appId, version),
  getFacebookSdk: () => getFacebookSdk(),
}));

const upsertChannel = jest.fn();
jest.mock("@/modules/channels/infrastructure/stores/channels.store", () => ({
  useChannelStore: (selector: (state: unknown) => unknown) => selector({ upsertChannel }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useEmbeddedSignup } = require("../use-embedded-signup") as typeof import("../use-embedded-signup");

const CONFIG: MetaSignupConfigDTO = {
  enabled: true,
  app_id: "111",
  config_id: "cfg-1",
  graph_api_version: "v21.0",
  product: "whatsapp",
};

const CHANNEL = {
  id: "ch-1",
  name: "Ventas",
  kind: "whatsapp_cloud",
  status: "connected",
  onboarding: { status: "completed", method: null, attempted_at: null, last_error_code: null },
} as unknown as ChannelDTO;

/** Mensaje del popup tal como lo manda Meta con `sessionInfoVersion: "3"`. */
function finishMessage(origin = "https://www.facebook.com"): MessageEvent {
  return new MessageEvent("message", {
    origin,
    data: JSON.stringify({
      type: "WA_EMBEDDED_SIGNUP",
      event: "FINISH",
      data: { phone_number_id: "555000111222", waba_id: "waba-1", business_id: "biz-1" },
    }),
  });
}

async function mountReady() {
  const view = renderHook(() => useEmbeddedSignup({ product: "whatsapp", channelName: "Ventas" }));
  await waitFor(() => expect(view.result.current.phase).toBe("ready"));
  return view;
}

describe("useEmbeddedSignup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loginCallback = null;
    loginOptions = null;
    getMetaSignupConfig.mockResolvedValue(CONFIG);
    loadFacebookSdk.mockResolvedValue({ init: jest.fn(), login });
    getFacebookSdk.mockReturnValue({ init: jest.fn(), login });
    completeMetaSignup.mockResolvedValue(CHANNEL);
  });

  it("al montar pide la configuración del producto y queda `ready`", async () => {
    const view = await mountReady();

    // `product` es query param OBLIGATORIO del endpoint
    expect(getMetaSignupConfig).toHaveBeenCalledWith("whatsapp");
    expect(view.result.current.config).toEqual(CONFIG);
  });

  it("sin configuración va a `unavailable`, no a `error`", async () => {
    // Capacidad no habilitada (flag apagado o colisión de rutas en el backend).
    // La diferencia importa: `unavailable` ofrece el camino manual y `error`
    // ofrece reintentar, y reintentar aquí no arregla nada.
    getMetaSignupConfig.mockResolvedValue(null);
    const view = renderHook(() => useEmbeddedSignup({ product: "whatsapp" }));

    await waitFor(() => expect(view.result.current.phase).toBe("unavailable"));
    expect(loadFacebookSdk).not.toHaveBeenCalled();
  });

  it("si el SDK no carga va a `unavailable` con el motivo tipado", async () => {
    loadFacebookSdk.mockRejectedValue(new Error("bloqueado"));
    const view = renderHook(() => useEmbeddedSignup({ product: "whatsapp" }));

    await waitFor(() => expect(view.result.current.phase).toBe("unavailable"));
    expect(view.result.current.error?.code).toBe("sdk/unknown");
  });

  it("usa el SDK VIVO, no el que resolvió la carga", async () => {
    // El bug de producción: Facebook REEMPLAZA window.FB durante su
    // inicialización. Con la referencia capturada, `login` seguía existiendo,
    // se llamaba, volvía sin lanzar y no abría nada — sin error ni en consola.
    // Desde la consola sí funcionaba, porque ahí se lee el global actual.
    const loginDelObjetoViejo = jest.fn();
    loadFacebookSdk.mockResolvedValue({ init: jest.fn(), login: loginDelObjetoViejo });
    const view = await mountReady();

    act(() => {
      view.result.current.start();
    });

    expect(loginDelObjetoViejo).not.toHaveBeenCalled();
    expect(login).toHaveBeenCalledTimes(1);
  });

  it("`start` invoca FB.login con los extras que Meta exige", async () => {
    const view = await mountReady();
    act(() => view.result.current.start());

    expect(view.result.current.phase).toBe("popup_open");
    expect(loginOptions).toEqual({
      config_id: "cfg-1",
      response_type: "code",
      override_default_response_type: true,
      // `sessionInfoVersion: "3"` es lo que garantiza que el `message` llegue en JSON
      extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
    });
  });

  it("envía cuando el `code` llega ANTES del sessionInfo", async () => {
    const view = await mountReady();
    act(() => view.result.current.start());

    act(() => loginCallback?.({ authResponse: { code: "AQD-code" } }));
    expect(completeMetaSignup).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(finishMessage());
    });

    await waitFor(() => expect(view.result.current.phase).toBe("success"));
    expect(completeMetaSignup).toHaveBeenCalledWith({
      code: "AQD-code",
      waba_id: "waba-1",
      phone_number_id: "555000111222",
      business_id: "biz-1",
      name: "Ventas",
    });
    expect(upsertChannel).toHaveBeenCalledWith(CHANNEL);
  });

  it("envía cuando el sessionInfo llega ANTES del `code`", async () => {
    // El orden es NO determinista: las dos rutas tienen que funcionar, y esta es
    // la que se olvida porque en desarrollo casi siempre llega primero el code
    const view = await mountReady();
    act(() => view.result.current.start());

    act(() => {
      window.dispatchEvent(finishMessage());
    });
    expect(completeMetaSignup).not.toHaveBeenCalled();

    act(() => loginCallback?.({ authResponse: { code: "AQD-code" } }));

    await waitFor(() => expect(completeMetaSignup).toHaveBeenCalledTimes(1));
  });

  it("un `origin` que solo CONTIENE facebook.com se rechaza", async () => {
    const view = await mountReady();
    act(() => view.result.current.start());
    act(() => loginCallback?.({ authResponse: { code: "AQD-code" } }));

    act(() => {
      // Dominio que cualquiera puede registrar: con `includes("facebook.com")`
      // pasaría el filtro y le entregaríamos el flujo a un tercero
      window.dispatchEvent(finishMessage("https://evilfacebook.com.attacker.io"));
    });

    expect(completeMetaSignup).not.toHaveBeenCalled();
    expect(view.result.current.phase).toBe("popup_open");
  });

  it("un CANCEL del popup lleva a `cancelled` sin enviar nada", async () => {
    const view = await mountReady();
    act(() => view.result.current.start());

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://www.facebook.com",
          data: JSON.stringify({ type: "WA_EMBEDDED_SIGNUP", event: "CANCEL" }),
        }),
      );
    });

    expect(view.result.current.phase).toBe("cancelled");
    expect(completeMetaSignup).not.toHaveBeenCalled();
  });

  it("un token en vez de `code` se explica, no se disfraza de cancelación", async () => {
    // Pasa cuando Meta ignora el config_id porque no es de esa app. La
    // heurística de tiempo lo tomaría por cancelación y el usuario reintentaría
    // eternamente un fallo de configuración.
    const view = await mountReady();
    act(() => {
      view.result.current.start();
    });
    act(() => {
      loginCallback?.({
        status: "connected",
        authResponse: { accessToken: "EAAVz-token-de-usuario" },
      });
    });

    await waitFor(() => expect(view.result.current.phase).toBe("error"));
    expect(view.result.current.error?.code).toBe("meta/config_not_applied");
    expect(completeMetaSignup).not.toHaveBeenCalled();
  });

  it("un callback sin `code` inmediato se interpreta como popup bloqueado", async () => {
    const view = await mountReady();
    act(() => view.result.current.start());

    // Un humano no autoriza ni cancela en menos de 600 ms: fue el navegador
    act(() => loginCallback?.({ status: "unknown" }));

    expect(view.result.current.phase).toBe("popup_blocked");
  });

  it("201 con `awaiting_registration` va a `awaiting_pin`, no a `success`", async () => {
    // El backend NO devuelve 409 aquí: el canal se crea igual y anota el
    // sub-estado, así que hay id con el que llamar al endpoint del PIN
    completeMetaSignup.mockResolvedValue({
      ...CHANNEL,
      onboarding: { status: "awaiting_registration", method: null, attempted_at: null, last_error_code: null },
    });
    const view = await mountReady();
    act(() => view.result.current.start());
    act(() => loginCallback?.({ authResponse: { code: "AQD-code" } }));
    act(() => {
      window.dispatchEvent(finishMessage());
    });

    await waitFor(() => expect(view.result.current.phase).toBe("awaiting_pin"));
    expect(view.result.current.channel?.id).toBe("ch-1");

    registerMetaPhoneNumber.mockResolvedValue(CHANNEL);
    await act(async () => {
      await view.result.current.submitPin("123456");
    });

    expect(registerMetaPhoneNumber).toHaveBeenCalledWith("ch-1", "123456");
    expect(view.result.current.phase).toBe("success");
  });

  it("en `awaiting_pin` NO avisa `onConnected`: avisar desmontaba el formulario del PIN", async () => {
    // El bug: los dos hosts reaccionan a `onConnected` desmontando el flujo (el
    // wizard salta a «Listo», el diálogo de reconexión se cierra con «Conexión
    // renovada»). Llamarlo aquí dejaba un canal mudo detrás de una pantalla de
    // éxito, sin ningún sitio donde teclear el PIN.
    completeMetaSignup.mockResolvedValue({
      ...CHANNEL,
      onboarding: { status: "awaiting_registration", method: null, attempted_at: null, last_error_code: null },
    });
    const onConnected = jest.fn();
    const view = renderHook(() => useEmbeddedSignup({ product: "whatsapp", onConnected }));
    await waitFor(() => expect(view.result.current.phase).toBe("ready"));
    act(() => view.result.current.start());
    act(() => loginCallback?.({ authResponse: { code: "AQD-code" } }));
    act(() => {
      window.dispatchEvent(finishMessage());
    });
    await waitFor(() => expect(view.result.current.phase).toBe("awaiting_pin"));

    expect(onConnected).not.toHaveBeenCalled();

    // Y SÍ avisa cuando el PIN cierra el registro: ahí termina de verdad
    registerMetaPhoneNumber.mockResolvedValue(CHANNEL);
    await act(async () => {
      await view.result.current.submitPin("123456");
    });
    expect(onConnected).toHaveBeenCalledTimes(1);
    expect(onConnected).toHaveBeenCalledWith(expect.objectContaining({ id: "ch-1" }));
  });

  it("un `code` caducado va a `error` conservando el código del backend", async () => {
    completeMetaSignup.mockRejectedValue(
      new HttpError({ status: 422, code: "channels/meta_code_expired", message: "expirado" }),
    );
    const view = await mountReady();
    act(() => view.result.current.start());
    act(() => loginCallback?.({ authResponse: { code: "AQD-code" } }));
    act(() => {
      window.dispatchEvent(finishMessage());
    });

    await waitFor(() => expect(view.result.current.phase).toBe("error"));
    // El código exacto es lo que F3 traduce a español: perderlo deja un mensaje
    // genérico donde había una instrucción concreta
    expect(view.result.current.error?.code).toBe("channels/meta_code_expired");
  });

  it("`meta_signup_disabled` en el POST cae a `unavailable`, no a `error`", async () => {
    completeMetaSignup.mockRejectedValue(
      new HttpError({ status: 503, code: "channels/meta_signup_disabled", message: "off" }),
    );
    const view = await mountReady();
    act(() => view.result.current.start());
    act(() => loginCallback?.({ authResponse: { code: "AQD-code" } }));
    act(() => {
      window.dispatchEvent(finishMessage());
    });

    await waitFor(() => expect(view.result.current.phase).toBe("unavailable"));
  });

  it("pulsar sin SDK listo NO deja la pantalla colgada en «esperando a Meta»", async () => {
    // Regresión real de F7: al extraer `useMetaPopup`, la guarda pasó a correr
    // DESPUÉS de pintar `popup_open` y se rendía en silencio. Como el watchdog
    // se arma después de esa guarda, la pantalla se quedaba así para siempre:
    // sin popup, sin error, sin consola y sin timeout.
    loadFacebookSdk.mockRejectedValueOnce(new Error("bloqueado"));
    // Si el SDK no cargó, el global tampoco existe
    getFacebookSdk.mockReturnValue(null);
    const view = renderHook(() => useEmbeddedSignup({ product: "whatsapp" }));
    await waitFor(() => expect(view.result.current.phase).toBe("unavailable"));

    act(() => {
      view.result.current.start();
    });

    await waitFor(() => expect(view.result.current.phase).toBe("unavailable"));
    expect(view.result.current.phase).not.toBe("popup_open");
    expect(view.result.current.error?.code).toBe("channels/meta_signup_disabled");
  });

  it("tres montajes y desmontajes NO acumulan listeners de `message`", async () => {
    // Es el bug que produce POST duplicados: cada intento deja su listener vivo
    // y el siguiente `code` dispara tantos POST como intentos hubo
    const added: string[] = [];
    const removed: string[] = [];
    const addSpy = jest.spyOn(window, "addEventListener");
    const removeSpy = jest.spyOn(window, "removeEventListener");
    addSpy.mockImplementation(((type: string) => {
      added.push(type);
    }) as never);
    removeSpy.mockImplementation(((type: string) => {
      removed.push(type);
    }) as never);

    try {
      for (let i = 0; i < 3; i += 1) {
        const view = renderHook(() => useEmbeddedSignup({ product: "whatsapp" }));
        await waitFor(() => expect(view.result.current.phase).toBe("ready"));
        act(() => view.result.current.start());
        view.unmount();
      }
    } finally {
      addSpy.mockRestore();
      removeSpy.mockRestore();
    }

    const addedMessages = added.filter((type) => type === "message").length;
    const removedMessages = removed.filter((type) => type === "message").length;
    expect(addedMessages).toBe(3);
    // Cada listener registrado se retira: ni uno queda vivo tras el desmontaje
    expect(removedMessages).toBeGreaterThanOrEqual(addedMessages);
  });
});

describe("useEmbeddedSignup — tiempos", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loginCallback = null;
    getMetaSignupConfig.mockResolvedValue(CONFIG);
    loadFacebookSdk.mockResolvedValue({ init: jest.fn(), login });
    completeMetaSignup.mockResolvedValue(CHANNEL);
  });

  it("si el sessionInfo no llega nunca, explica el fallo en vez de enviar un POST inválido", async () => {
    const view = await mountReady();
    act(() => view.result.current.start());

    jest.useFakeTimers();
    act(() => loginCallback?.({ authResponse: { code: "AQD-code" } }));
    act(() => {
      jest.advanceTimersByTime(8_000);
    });
    jest.useRealTimers();

    // `waba_id` y `phone_number_id` son OBLIGATORIOS en el DTO: enviar sin ellos
    // sería un 422 garantizado, así que se prefiere un error explicado
    expect(completeMetaSignup).not.toHaveBeenCalled();
    expect(view.result.current.phase).toBe("error");
    expect(view.result.current.error?.code).toBe("meta/session_info_missing");
  });

  it("tres minutos de silencio tras abrir el popup se resuelven como abandono", async () => {
    const view = await mountReady();

    // Los timers falsos se instalan ANTES de `start`: el watchdog se programa
    // dentro de `start`, así que instalarlos después dejaría un timer real que
    // `advanceTimersByTime` no puede adelantar y el test pasaría en verde
    // asertando nada.
    jest.useFakeTimers();
    act(() => view.result.current.start());
    act(() => {
      jest.advanceTimersByTime(180_000);
    });
    jest.useRealTimers();

    // Sin watchdog la UI se queda en "esperando a Meta" para siempre cuando el
    // popup se cierra de una forma que no emite CANCEL
    expect(view.result.current.phase).toBe("cancelled");
  });
});
