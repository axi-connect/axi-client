"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { MetaProduct, MetaSignupConfigDTO } from "@/modules/channels/domain/meta-signup";
import { FacebookSdkError } from "@/modules/channels/domain/meta-signup";
import {
  getFacebookSdk,
  loadFacebookSdk,
  type FbLoginResponse,
} from "@/modules/channels/infrastructure/services/facebook-sdk";
import { getMetaSignupConfig } from "@/modules/channels/infrastructure/services/meta-signup.adapter";

/**
 * Base común de los dos flujos de popup de Meta (F7).
 *
 * Existe porque WhatsApp y las páginas comparten TODO lo frágil —cargar el SDK,
 * resolver la configuración, invocar `FB.login` sin romper el gesto del usuario,
 * distinguir un popup bloqueado de una cancelación, y el abandono— y difieren
 * solo en qué hacen con el `code`. Duplicarlo significaría que un arreglo en la
 * heurística del popup se aplica en un flujo y no en el otro.
 *
 * Lo que este hook NO hace, a propósito: no escucha `message` ni envía nada. El
 * popup de WhatsApp devuelve identificadores por `postMessage` y el de páginas
 * no, así que esa parte es de cada flujo.
 */

/**
 * Traza del intento de conexión.
 *
 * Siempre activa y en `info`, no detrás de un flag: el modo de fallo de este
 * flujo es **no hacer nada** —sin popup, sin error, sin excepción— y sin estas
 * líneas es indistinguible desde fuera. Son unas pocas por clic, solo durante
 * un intento, nunca en render.
 */
export function logSignup(step: string, fields: Record<string, unknown> = {}): void {
  console.info(`[meta-signup] ${step}`, fields);
}

const ABANDON_WATCHDOG_MS = 180_000;
/** Un humano no autoriza ni cancela en menos de esto: por debajo, fue el navegador. */
const POPUP_BLOCKED_THRESHOLD_MS = 600;

export type MetaPopupStatus = "preparing" | "ready" | "unavailable";

export type MetaPopupError = {
  /** `code` RFC 7807 del backend, o un código local del cliente. */
  code: string;
  message: string;
};

export type MetaPopupResult =
  | { outcome: "code"; code: string }
  | { outcome: "blocked" }
  | { outcome: "cancelled" }
  /**
   * Meta devolvió un token de usuario en vez del `code`, que es lo que pasa
   * cuando **ignora el `config_id`** — normalmente porque esa configuración no
   * pertenece a la app del `app_id`. Tiene salida propia porque la heurística
   * de tiempo lo tomaría por una cancelación, y decirle al usuario "cancelaste"
   * ante un error de configuración lo manda a reintentar para siempre.
   */
  | { outcome: "config_ignored" }
  /**
   * El SDK o el `config_id` no estaban al pulsar. **Siempre se reporta**, nunca
   * se vuelve en silencio: el flujo ya pintó "esperando a Meta" antes de
   * llamar, así que rendirse sin avisar deja la pantalla colgada para siempre
   * —y sin watchdog, porque este se arma después de esta guarda—.
   */
  | { outcome: "unavailable" };

export type UseMetaPopupResult = {
  status: MetaPopupStatus;
  config: MetaSignupConfigDTO | null;
  error: MetaPopupError | null;
  /** `true` cuando el SDK y el `config_id` están listos. */
  ready: boolean;
  /**
   * Abre el popup. **NO es `async`**, y esa es la decisión más importante:
   * entre el clic del usuario y `FB.login` no puede haber ni un `await`, o el
   * navegador bloquea la ventana. Por eso el botón nace deshabilitado hasta
   * `ready` en vez de cargar el SDK al pulsarlo.
   */
  open: (handlers: {
    /** Corre justo antes de `FB.login`: es donde registrar listeners. */
    beforeOpen?: () => void;
    onResult: (result: MetaPopupResult) => void;
  }) => void;
  /** Corta el abandono del intento en curso. Lo llama el flujo al resolver. */
  clearWatchdog: () => void;
};

export function useMetaPopup(product: MetaProduct): UseMetaPopupResult {
  const [status, setStatus] = useState<MetaPopupStatus>("preparing");
  const [config, setConfig] = useState<MetaSignupConfigDTO | null>(null);
  const [error, setError] = useState<MetaPopupError | null>(null);

  /** Solo marca que la carga terminó. El objeto se lee del global al usarlo. */
  const loadedRef = useRef(false);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef<number>(0);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current !== null) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    // SDK y configuración en paralelo: son independientes y en serie duplicarían
    // el tiempo que el botón pasa deshabilitado
    void (async () => {
      const configResult = await getMetaSignupConfig(product).catch((err: unknown) => {
        console.warn("[meta-signup] La configuración falló:", err);
        return null;
      });
      if (cancelled) return;

      // `null` = capacidad ausente (flag apagado, config_id sin poner). No es un
      // error: es el disparador del camino manual.
      if (configResult === null || !configResult.enabled) {
        setStatus("unavailable");
        setError({
          code: "channels/meta_signup_disabled",
          message: "La conexión automática con Meta no está disponible ahora mismo.",
        });
        return;
      }
      setConfig(configResult);

      try {
        const sdk = await loadFacebookSdk(configResult.app_id, configResult.graph_api_version);
        if (cancelled) return;
        loadedRef.current = sdk !== null;
        setStatus("ready");
        setError(null);
      } catch (err) {
        if (cancelled) return;
        loadedRef.current = false;
        setStatus("unavailable");
        setError({
          code: err instanceof FacebookSdkError ? `sdk/${err.reason}` : "sdk/unknown",
          message:
            "No pudimos cargar el conector de Meta. Suele ser un bloqueador de anuncios o la red de tu empresa.",
        });
      }
    })();

    return () => {
      cancelled = true;
      clearWatchdog();
    };
  }, [product, clearWatchdog]);

  const open = useCallback(
    (handlers: { beforeOpen?: () => void; onResult: (result: MetaPopupResult) => void }) => {
      // Se lee AQUÍ, no de una referencia guardada: ver `getFacebookSdk`
      const sdk = getFacebookSdk();
      const configId = config?.config_id ?? null;

      logSignup("open() llamado", {
        sdk_cargado: sdk !== null,
        carga_completada: loadedRef.current,
        config_id: configId,
        tipo_config_id: typeof configId,
        app_id: config?.app_id ?? null,
        graph_api_version: config?.graph_api_version ?? null,
        enabled: config?.enabled ?? null,
      });

      if (sdk === null || configId === null) {
        console.warn("[meta-signup] Se pulsó conectar sin SDK o sin config_id", {
          sdk_loaded: sdk !== null,
          config_id: configId,
        });
        setStatus("unavailable");
        handlers.onResult({ outcome: "unavailable" });
        return;
      }

      startedAtRef.current = Date.now();
      try {
        handlers.beforeOpen?.();
        logSignup("beforeOpen ok (listener registrado)");
      } catch (err) {
        // Si esto lanzara, el clic moriría aquí y `FB.login` nunca correría
        logSignup("beforeOpen LANZÓ", { error: String(err) });
        handlers.onResult({ outcome: "cancelled" });
        return;
      }

      // Abandono: tres minutos sin ninguna señal. Sin esto la UI se queda en
      // "esperando a Meta" para siempre si el usuario cierra el popup de una
      // forma que no emite CANCEL.
      clearWatchdog();
      watchdogRef.current = setTimeout(() => {
        handlers.onResult({ outcome: "cancelled" });
      }, ABANDON_WATCHDOG_MS);

      const callback = (response: FbLoginResponse) => {
        logSignup("callback de FB.login", {
          status: response.status,
          tiene_code: typeof response.authResponse?.code === "string",
          tiene_access_token: response.authResponse?.accessToken !== undefined,
          ms_transcurridos: Date.now() - startedAtRef.current,
        });
        const code = response.authResponse?.code;
        if (typeof code === "string" && code !== "") {
          handlers.onResult({ outcome: "code", code });
          return;
        }

        // Autorizó y volvió con TOKEN en vez de code: el `config_id` no se
        // aplicó. Sin este caso, la heurística de abajo lo llamaría
        // "cancelaste" y el usuario reintentaría eternamente un fallo de
        // configuración.
        if (response.authResponse?.accessToken !== undefined) {
          console.warn(
            "[meta-signup] Meta devolvió un access token en vez del code: el config_id no se aplicó",
            { config_id: configId, app_id: config?.app_id },
          );
          handlers.onResult({ outcome: "config_ignored" });
          return;
        }

        // Sin `code` puede ser cancelación o popup bloqueado, y el SDK no los
        // distingue. Heurística: un humano no autoriza ni cancela en menos de
        // 600 ms, así que por debajo de ese umbral fue el navegador.
        const elapsed = Date.now() - startedAtRef.current;
        handlers.onResult({
          outcome: elapsed < POPUP_BLOCKED_THRESHOLD_MS ? "blocked" : "cancelled",
        });
      };

      const options = {
        config_id: configId,
        response_type: "code" as const,
        override_default_response_type: true,
        // `sessionInfoVersion: "3"` es lo que garantiza que el `message` llegue
        // en JSON en vez de en el formato antiguo
        extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
      };

      logSignup("llamando a FB.login", { options, tipo_login: typeof sdk.login });
      try {
        sdk.login(callback, options);
        // Si esta línea sale y NO aparece "callback de FB.login" después, el SDK
        // aceptó la llamada y no abrió nada: el problema está del lado de Meta
        // (dominio del SDK, modo de la app, rol de la cuenta)
        logSignup("FB.login volvió sin lanzar");
      } catch (err) {
        logSignup("FB.login LANZÓ de forma síncrona", { error: String(err) });
        handlers.onResult({ outcome: "blocked" });
      }
    },
    [clearWatchdog, config],
  );

  return {
    status,
    config,
    error,
    ready: status === "ready",
    open,
    clearWatchdog,
  };
}
