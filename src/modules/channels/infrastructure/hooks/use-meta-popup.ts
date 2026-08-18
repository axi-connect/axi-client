"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { MetaProduct, MetaSignupConfigDTO } from "@/modules/channels/domain/meta-signup";
import { FacebookSdkError } from "@/modules/channels/domain/meta-signup";
import {
  loadFacebookSdk,
  type FacebookSdk,
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

  const sdkRef = useRef<FacebookSdk | null>(null);
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
        sdkRef.current = sdk;
        setStatus("ready");
        setError(null);
      } catch (err) {
        if (cancelled) return;
        sdkRef.current = null;
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
      const sdk = sdkRef.current;
      const configId = config?.config_id ?? null;
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
      handlers.beforeOpen?.();

      // Abandono: tres minutos sin ninguna señal. Sin esto la UI se queda en
      // "esperando a Meta" para siempre si el usuario cierra el popup de una
      // forma que no emite CANCEL.
      clearWatchdog();
      watchdogRef.current = setTimeout(() => {
        handlers.onResult({ outcome: "cancelled" });
      }, ABANDON_WATCHDOG_MS);

      const callback = (response: FbLoginResponse) => {
        const code = response.authResponse?.code;
        if (typeof code === "string" && code !== "") {
          handlers.onResult({ outcome: "code", code });
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

      try {
        sdk.login(callback, {
          config_id: configId,
          response_type: "code",
          override_default_response_type: true,
          // `sessionInfoVersion: "3"` es lo que garantiza que el `message` llegue
          // en JSON en vez de en el formato antiguo
          extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
        });
      } catch (err) {
        console.warn("[meta-signup] FB.login lanzó de forma síncrona:", err);
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
