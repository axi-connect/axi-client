"use client";

import { useCallback, useRef, useState } from "react";

import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import type { ChannelDTO } from "@/modules/channels/domain/channel";
import { SIGNUP_ERRORS, type EmbeddedSignupPhase } from "@/modules/channels/domain/meta-signup";
import type { Schemas } from "@/core/api/types";
import { useChannelStore } from "@/modules/channels/infrastructure/stores/channels.store";
import {
  connectMetaPageChannel,
  listMetaPageAssets,
} from "@/modules/channels/infrastructure/services/meta-signup.adapter";
import { logSignup, useMetaPopup, type MetaPopupError } from "./use-meta-popup";
import { useSignupPhase } from "./use-signup-phase";

/**
 * Alta por botón de Instagram y Messenger (F7).
 *
 * Se separa de `useEmbeddedSignup` porque los flujos son genuinamente distintos,
 * y lo son porque Meta los hizo así: el popup de WhatsApp devuelve el número por
 * `postMessage`, y el de páginas **solo devuelve el `code`**. Los activos se
 * descubren en el servidor y puede haber varios, así que aparece un paso que
 * WhatsApp no tiene: elegir.
 *
 * Lo frágil —SDK, configuración, `FB.login` síncrono, popup bloqueado,
 * abandono— vive en `useMetaPopup` y es exactamente el mismo código que usa
 * WhatsApp.
 */

export type PageAsset = Schemas["MetaPageAssetsDto"]["assets"][number];

export type UsePageSignupOptions = {
  product: "instagram" | "messenger";
  onConnected?: (channel: ChannelDTO) => void;
};

export type UsePageSignupResult = {
  phase: EmbeddedSignupPhase;
  error: MetaPopupError | null;
  channel: ChannelDTO | null;
  /** Activos autorizados, solo en `choosing_asset`. */
  assets: PageAsset[];
  connecting: boolean;
  start: () => void;
  choose: (assetId: string) => void;
  reset: () => void;
  /** Vuelve a pedir configuración y SDK tras un fallo de red (ver `useMetaPopup`). */
  retryConfig: () => void;
};

export function usePageSignup({ product, onConnected }: UsePageSignupOptions): UsePageSignupResult {
  const popup = useMetaPopup(product);
  const { open: openPopup, clearWatchdog } = popup;
  const upsertChannel = useChannelStore((s) => s.upsertChannel);

  const [channel, setChannel] = useState<ChannelDTO | null>(null);
  const [assets, setAssets] = useState<PageAsset[]>([]);
  const [connecting, setConnecting] = useState(false);

  const sessionRef = useRef<string | null>(null);
  // Fase, error y `mountedRef`: el mismo código que WhatsApp, una sola vez
  const { phase, setPhase, error, setError, mountedRef } = useSignupPhase(popup);

  const fail = useCallback((failure: MetaPopupError) => {
    if (!mountedRef.current) return;
    setPhase(failure.code === "channels/meta_signup_disabled" ? "unavailable" : "error");
    setError(failure);
  }, [mountedRef, setError, setPhase]);

  /** Paso 1: el `code` se canjea en el servidor y vuelven los activos. */
  const exchange = useCallback(
    async (code: string) => {
      if (mountedRef.current) setPhase("exchanging");
      try {
        const result = await listMetaPageAssets({ code, product });
        if (!mountedRef.current) return;
        sessionRef.current = result.session_id;
        setAssets(result.assets);
        setError(null);
        setPhase("choosing_asset");
      } catch (err) {
        fail({
          code: isHttpError(err) ? err.code : "channels/signup_failed",
          message: errorMessage(err, "No se pudieron leer tus páginas"),
        });
      }
    },
    [fail, mountedRef, product, setError, setPhase],
  );

  const start = useCallback(() => {
    logSignup("start() — clic recibido (páginas)", { product });
    clearWatchdog();
    setChannel(null);
    setAssets([]);
    setError(null);
    sessionRef.current = null;
    setPhase("popup_open");

    openPopup({
      onResult: (result) => {
        clearWatchdog();
        if (result.outcome === "unavailable") {
          fail(SIGNUP_ERRORS.disabled);
          return;
        }
        if (result.outcome === "config_ignored") {
          fail(SIGNUP_ERRORS.config_not_applied);
          return;
        }
        // Por la guarda: el watchdog de abandono dispara hasta 180 s después,
        // con el componente posiblemente desmontado
        if (result.outcome === "blocked") {
          if (mountedRef.current) setPhase("popup_blocked");
          return;
        }
        if (result.outcome === "cancelled") {
          if (mountedRef.current) setPhase("cancelled");
          return;
        }
        void exchange(result.code);
      },
    });
  }, [clearWatchdog, exchange, fail, mountedRef, openPopup, product, setError, setPhase]);

  /**
   * Paso 2. El `asset_id` viaja opaco: el servidor lo valida contra la sesión,
   * así que la interfaz no puede reclamar una página que no se autorizó.
   */
  const choose = useCallback(
    (assetId: string) => {
      const sessionId = sessionRef.current;
      if (sessionId === null || connecting) return;

      setConnecting(true);
      void (async () => {
        try {
          // Sin `name`: el backend nombra el canal con la página o la cuenta que
          // se acaba de elegir, que es más preciso que cualquier cosa que el
          // usuario pudiera teclear antes de ver la lista
          const created = await connectMetaPageChannel({
            session_id: sessionId,
            asset_id: assetId,
          });
          upsertChannel(created);
          if (!mountedRef.current) return;
          setChannel(created);
          setError(null);
          setPhase("success");
          onConnected?.(created);
        } catch (err) {
          fail({
            code: isHttpError(err) ? err.code : "channels/signup_failed",
            message: errorMessage(err, "No se pudo conectar la página"),
          });
        } finally {
          if (mountedRef.current) setConnecting(false);
        }
      })();
    },
    [connecting, fail, mountedRef, onConnected, setError, setPhase, upsertChannel],
  );

  const reset = useCallback(() => {
    clearWatchdog();
    sessionRef.current = null;
    setChannel(null);
    setAssets([]);
    setError(null);
    setPhase(popup.ready ? "ready" : "unavailable");
  }, [clearWatchdog, popup.ready, setError, setPhase]);

  return {
    phase,
    error,
    channel,
    assets,
    connecting,
    start,
    choose,
    reset,
    retryConfig: popup.retryConfig,
  };
}
