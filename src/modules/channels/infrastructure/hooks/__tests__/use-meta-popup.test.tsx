import { act, renderHook, waitFor } from "@testing-library/react";

import type { MetaProduct, MetaSignupConfigDTO } from "@/modules/channels/domain/meta-signup";
import type { FbLoginOptions, FbLoginResponse } from "../../services/facebook-sdk";

/**
 * La base compartida de los dos popups tiene una diferencia que NO es cosmética
 * y que ninguna revisión visual detecta: el objeto `extras`
 * (`setup`/`featureType`/`sessionInfoVersion`) pertenece al Embedded Signup de
 * WhatsApp y a nada más. Mandárselo a una configuración de Facebook Login for
 * Business —Instagram, Messenger— hacía que Meta abriera el diálogo y lo
 * reventara contra su pantalla genérica de "Sorry, something went wrong", sin
 * error, sin código y sin nada que registrar de este lado.
 *
 * Se assertan las OPCIONES que salen hacia `FB.login`, que es el contrato real
 * con Meta y el único sitio donde la regresión sería visible antes de producción.
 */
const getMetaSignupConfig = jest.fn<Promise<MetaSignupConfigDTO | null>, [string]>();

jest.mock("../../services/meta-signup.adapter", () => ({
  getMetaSignupConfig: (product: string) => getMetaSignupConfig(product),
}));

let loginOptions: FbLoginOptions | null = null;
const login = jest.fn((_cb: (response: FbLoginResponse) => void, options: FbLoginOptions) => {
  loginOptions = options;
});
const loadFacebookSdk = jest.fn();
const getFacebookSdk = jest.fn();

jest.mock("../../services/facebook-sdk", () => ({
  loadFacebookSdk: (appId: string | null, version: string) => loadFacebookSdk(appId, version),
  getFacebookSdk: () => getFacebookSdk(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useMetaPopup } = require("../use-meta-popup") as typeof import("../use-meta-popup");

function config(product: MetaProduct): MetaSignupConfigDTO {
  return { enabled: true, app_id: "111", config_id: `cfg-${product}`, graph_api_version: "v21.0", product };
}

async function openFor(product: MetaProduct) {
  getMetaSignupConfig.mockResolvedValue(config(product));
  const sdk = { login };
  loadFacebookSdk.mockResolvedValue(sdk);
  getFacebookSdk.mockReturnValue(sdk);

  const { result } = renderHook(() => useMetaPopup(product));
  await waitFor(() => expect(result.current.ready).toBe(true));
  act(() => result.current.open({ onResult: jest.fn() }));
  return loginOptions;
}

beforeEach(() => {
  jest.clearAllMocks();
  loginOptions = null;
});

describe("useMetaPopup — opciones de FB.login por producto", () => {
  it("WhatsApp SÍ manda los extras del Embedded Signup", async () => {
    const options = await openFor("whatsapp");

    expect(options).toEqual({
      config_id: "cfg-whatsapp",
      response_type: "code",
      override_default_response_type: true,
      // `sessionInfoVersion: "3"` es lo que trae el `message` en JSON
      extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
    });
  });

  it.each(["instagram", "messenger"] as const)(
    "%s NO manda extras: con ellos Meta reventaba el diálogo",
    async (product) => {
      const options = await openFor(product);

      expect(options).not.toHaveProperty("extras");
      expect(options).toEqual({
        config_id: `cfg-${product}`,
        response_type: "code",
        override_default_response_type: true,
      });
    },
  );
});

describe("useMetaPopup — la configuración que no se pudo LEER no es capacidad ausente", () => {
  it("un fallo de red deja `unavailable` con un código reintentable, y `retryConfig` vuelve a pedirla", async () => {
    // El adapter ya devuelve `null` en los dos casos legítimos de ausencia
    // (503 disabled, 400 por colisión de rutas). Lo que lanza es otra cosa —red,
    // 5xx— y tratarlo como ausencia mandaba al usuario a pegar tokens por un
    // hipo de un segundo, sin más salida que recargar.
    getMetaSignupConfig.mockRejectedValueOnce(new Error("Failed to fetch"));
    getMetaSignupConfig.mockResolvedValueOnce(config("whatsapp"));
    const sdk = { login };
    loadFacebookSdk.mockResolvedValue(sdk);
    getFacebookSdk.mockReturnValue(sdk);

    const { result } = renderHook(() => useMetaPopup("whatsapp"));
    await waitFor(() => expect(result.current.status).toBe("unavailable"));
    expect(result.current.error?.code).toBe("channels/meta_config_unreachable");

    act(() => result.current.retryConfig());

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(getMetaSignupConfig).toHaveBeenCalledTimes(2);
  });

  it("la ausencia real (adapter devuelve null) sigue siendo `meta_signup_disabled`, sin reintento", async () => {
    getMetaSignupConfig.mockResolvedValue(null);

    const { result } = renderHook(() => useMetaPopup("whatsapp"));
    await waitFor(() => expect(result.current.status).toBe("unavailable"));

    expect(result.current.error?.code).toBe("channels/meta_signup_disabled");
    expect(loadFacebookSdk).not.toHaveBeenCalled();
  });
});
