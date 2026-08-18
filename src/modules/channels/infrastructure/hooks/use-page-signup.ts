"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import type { ChannelDTO } from "@/modules/channels/domain/channel";
import type { EmbeddedSignupPhase } from "@/modules/channels/domain/meta-signup";
import type { Schemas } from "@/core/api/types";
import { useChannelStore } from "@/modules/channels/infrastructure/stores/channels.store";
import {
  connectMetaPageChannel,
  listMetaPageAssets,
} from "@/modules/channels/infrastructure/services/meta-signup.adapter";
import { useMetaPopup, type MetaPopupError } from "./use-meta-popup";

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
  channelName?: string;
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
};

export function usePageSignup({
  product,
  channelName,
  onConnected,
}: UsePageSignupOptions): UsePageSignupResult {
  const popup = useMetaPopup(product);
  const { open: openPopup, clearWatchdog } = popup;
  const upsertChannel = useChannelStore((s) => s.upsertChannel);

  const [phase, setPhase] = useState<EmbeddedSignupPhase>("preparing");
  const [error, setError] = useState<MetaPopupError | null>(null);
  const [channel, setChannel] = useState<ChannelDTO | null>(null);
  const [assets, setAssets] = useState<PageAsset[]>([]);
  const [connecting, setConnecting] = useState(false);

  const sessionRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearWatchdog();
    };
  }, [clearWatchdog]);

  useEffect(() => {
    if (popup.status === "preparing") return;
    setPhase((current) =>
      current === "preparing" || current === "unavailable"
        ? popup.status === "ready"
          ? "ready"
          : "unavailable"
        : current,
    );
    if (popup.error !== null) setError(popup.error);
  }, [popup.status, popup.error]);

  const fail = useCallback((failure: MetaPopupError) => {
    if (!mountedRef.current) return;
    setPhase(failure.code === "channels/meta_signup_disabled" ? "unavailable" : "error");
    setError(failure);
  }, []);

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
    [fail, product],
  );

  const start = useCallback(() => {
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
          fail({
            code: "channels/meta_signup_disabled",
            message: "La conexión automática con Meta no está disponible ahora mismo.",
          });
          return;
        }
        if (result.outcome === "blocked") {
          setPhase("popup_blocked");
          return;
        }
        if (result.outcome === "cancelled") {
          setPhase("cancelled");
          return;
        }
        void exchange(result.code);
      },
    });
  }, [clearWatchdog, exchange, fail, openPopup]);

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
          const created = await connectMetaPageChannel({
            session_id: sessionId,
            asset_id: assetId,
            ...(channelName !== undefined && channelName.trim() !== ""
              ? { name: channelName.trim() }
              : {}),
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
    [channelName, connecting, fail, onConnected, upsertChannel],
  );

  const reset = useCallback(() => {
    clearWatchdog();
    sessionRef.current = null;
    setChannel(null);
    setAssets([]);
    setError(null);
    setPhase(popup.ready ? "ready" : "unavailable");
  }, [clearWatchdog, popup.ready]);

  return { phase, error, channel, assets, connecting, start, choose, reset };
}
