import { act, renderHook, waitFor } from "@testing-library/react";

import { HttpError } from "@/core/api/problem";
import type { ChannelDTO } from "@/modules/channels/domain/channel";
import type { MetaSignupConfigDTO } from "@/modules/channels/domain/meta-signup";
import type { FbLoginResponse } from "../../services/facebook-sdk";

/**
 * El alta por botón de Instagram y Messenger es justo lo que Meta acaba de
 * aprobar, y hasta aquí tenía CERO tests; su gemelo de WhatsApp, cuatrocientas
 * líneas. Esto cubre la máquina de estados propia del flujo —el paso de elegir
 * activo, que WhatsApp no tiene— y sus salidas.
 */

const getMetaSignupConfig = jest.fn<Promise<MetaSignupConfigDTO | null>, [string]>();
const listMetaPageAssets = jest.fn();
const connectMetaPageChannel = jest.fn();

jest.mock("../../services/meta-signup.adapter", () => ({
  getMetaSignupConfig: (product: string) => getMetaSignupConfig(product),
  listMetaPageAssets: (payload: unknown) => listMetaPageAssets(payload),
  connectMetaPageChannel: (payload: unknown) => connectMetaPageChannel(payload),
}));

let loginCallback: ((response: FbLoginResponse) => void) | null = null;
const login = jest.fn((cb: (response: FbLoginResponse) => void) => {
  loginCallback = cb;
});
const loadFacebookSdk = jest.fn();
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
const { usePageSignup } = require("../use-page-signup") as typeof import("../use-page-signup");

const CONFIG: MetaSignupConfigDTO = {
  enabled: true,
  app_id: "111",
  config_id: "cfg-ig",
  graph_api_version: "v21.0",
  product: "instagram",
};

const ASSETS = {
  session_id: "sess-1",
  product: "instagram",
  assets: [
    { asset_id: "ig-1", name: "Tienda", username: "tienda", already_connected: false, unavailable: false },
    { asset_id: "ig-2", name: "Otra", username: "otra", already_connected: false, unavailable: true },
  ],
};

const CHANNEL = { id: "ch-ig", name: "Tienda", kind: "instagram_dm", status: "connected" } as unknown as ChannelDTO;

async function mountReady(onConnected?: (channel: ChannelDTO) => void) {
  const view = renderHook(() => usePageSignup({ product: "instagram", onConnected }));
  await waitFor(() => expect(view.result.current.phase).toBe("ready"));
  return view;
}

/** Autoriza en el popup y espera a que el backend devuelva los activos. */
async function authorize(view: Awaited<ReturnType<typeof mountReady>>) {
  act(() => view.result.current.start());
  expect(view.result.current.phase).toBe("popup_open");
  await act(async () => {
    loginCallback?.({ authResponse: { code: "AQD-code" } });
    await Promise.resolve();
  });
}

describe("usePageSignup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loginCallback = null;
    getMetaSignupConfig.mockResolvedValue(CONFIG);
    const sdk = { init: jest.fn(), login };
    loadFacebookSdk.mockResolvedValue(sdk);
    getFacebookSdk.mockReturnValue(sdk);
    listMetaPageAssets.mockResolvedValue(ASSETS);
    connectMetaPageChannel.mockResolvedValue(CHANNEL);
  });

  it("pide la configuración del producto de PÁGINAS, no la de WhatsApp", async () => {
    await mountReady();
    expect(getMetaSignupConfig).toHaveBeenCalledWith("instagram");
  });

  it("el code se canjea al instante y el flujo pasa a elegir activo", async () => {
    const view = await mountReady();
    await authorize(view);

    await waitFor(() => expect(view.result.current.phase).toBe("choosing_asset"));
    // El code vive 30 s y es de un solo uso: sale sin confirmación intermedia
    expect(listMetaPageAssets).toHaveBeenCalledWith({ code: "AQD-code", product: "instagram" });
    expect(view.result.current.assets).toHaveLength(2);
  });

  it("elegir manda el session_id opaco y el asset_id, nunca un token", async () => {
    const onConnected = jest.fn();
    const view = await mountReady(onConnected);
    await authorize(view);
    await waitFor(() => expect(view.result.current.phase).toBe("choosing_asset"));

    await act(async () => {
      view.result.current.choose("ig-1");
      await Promise.resolve();
    });

    await waitFor(() => expect(view.result.current.phase).toBe("success"));
    expect(connectMetaPageChannel).toHaveBeenCalledWith({ session_id: "sess-1", asset_id: "ig-1" });
    expect(upsertChannel).toHaveBeenCalledWith(CHANNEL);
    expect(onConnected).toHaveBeenCalledWith(CHANNEL);
  });

  it("una sesión vencida (410) va a `error` conservando el código del backend", async () => {
    connectMetaPageChannel.mockRejectedValue(
      new HttpError({ status: 410, code: "channels/meta_signup_session_expired", message: "vencida" }),
    );
    const view = await mountReady();
    await authorize(view);
    await waitFor(() => expect(view.result.current.phase).toBe("choosing_asset"));

    await act(async () => {
      view.result.current.choose("ig-1");
      await Promise.resolve();
    });

    await waitFor(() => expect(view.result.current.phase).toBe("error"));
    expect(view.result.current.error?.code).toBe("channels/meta_signup_session_expired");
  });

  it("sin activos que conectar (422) el error nombra la causa, no dice «cancelaste»", async () => {
    listMetaPageAssets.mockRejectedValue(
      new HttpError({ status: 422, code: "channels/meta_no_assets", message: "ninguna página" }),
    );
    const view = await mountReady();
    await authorize(view);

    await waitFor(() => expect(view.result.current.phase).toBe("error"));
    expect(view.result.current.error?.code).toBe("channels/meta_no_assets");
  });

  it("elegir dos veces mientras conecta no dispara dos altas", async () => {
    let release: () => void = () => undefined;
    connectMetaPageChannel.mockImplementation(
      () => new Promise((resolve) => (release = () => resolve(CHANNEL))),
    );
    const view = await mountReady();
    await authorize(view);
    await waitFor(() => expect(view.result.current.phase).toBe("choosing_asset"));

    act(() => view.result.current.choose("ig-1"));
    act(() => view.result.current.choose("ig-1"));
    await act(async () => {
      release();
      await Promise.resolve();
    });

    expect(connectMetaPageChannel).toHaveBeenCalledTimes(1);
  });

  it("un token en vez de code (config_id ignorado) es un error de configuración, no una cancelación", async () => {
    const view = await mountReady();
    act(() => view.result.current.start());
    act(() => loginCallback?.({ status: "connected", authResponse: { accessToken: "EAAG" } }));

    expect(view.result.current.phase).toBe("error");
    expect(view.result.current.error?.code).toBe("meta/config_not_applied");
  });

  it("`reset` descarta la sesión: elegir después no manda nada", async () => {
    const view = await mountReady();
    await authorize(view);
    await waitFor(() => expect(view.result.current.phase).toBe("choosing_asset"));

    act(() => view.result.current.reset());
    act(() => view.result.current.choose("ig-1"));

    expect(view.result.current.phase).toBe("ready");
    expect(connectMetaPageChannel).not.toHaveBeenCalled();
  });
});
