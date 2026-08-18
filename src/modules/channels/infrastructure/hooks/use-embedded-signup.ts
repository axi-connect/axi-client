"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import type { ChannelDTO } from "@/modules/channels/domain/channel";
import {
  isTrustedMetaOrigin,
  parseWaSignupMessage,
  type EmbeddedSignupPhase,
  type MetaEmbeddedSignupDTO,
  type MetaOnboardingStatus,
  type MetaProduct,
  type MetaSignupConfigDTO,
} from "@/modules/channels/domain/meta-signup";
import { useChannelStore } from "@/modules/channels/infrastructure/stores/channels.store";

import {
  completeMetaSignup,
  registerMetaPhoneNumber,
} from "@/modules/channels/infrastructure/services/meta-signup.adapter";
import { useMetaPopup, type MetaPopupError } from "./use-meta-popup";

/**
 * Máquina de estados del Embedded Signup (F2). Sin UI: F3 la consume.
 *
 * El orden de las operaciones no es estilo, lo impone Meta:
 *
 * 1. Al montar, SDK y configuración **en paralelo** → `ready` o `unavailable`.
 * 2. El listener de `message` se registra **antes** de `FB.login`, nunca después:
 *    el popup puede mandar su `FINISH` antes de que el callback del SDK dispare.
 * 3. `FB.login` se invoca **síncronamente** dentro del handler del clic. Un
 *    `await` intermedio rompe la cadena de gesto de usuario y el navegador
 *    bloquea el popup. Por eso el botón nace deshabilitado hasta `ready` en vez
 *    de cargar el SDK al pulsarlo.
 * 4. `code` y `sessionInfo` llegan por **dos vías asíncronas en orden no
 *    determinista**. Se acumulan en refs y el POST sale en cuanto están los dos.
 * 5. El `code` vive **30 segundos** y es de un solo uso: el POST sale sin
 *    confirmación intermedia y un fallo **nunca** reintenta el mismo `code`,
 *    siempre reabre `FB.login`.
 */

const SESSION_INFO_GRACE_MS = 8_000;

/** Alias: el error es el mismo que el de la base compartida (F7). */
export type EmbeddedSignupError = MetaPopupError;

export type UseEmbeddedSignupOptions = {
  product: MetaProduct;
  /** Nombre del canal. El backend lo acepta en el alta: no hace falta PATCH. */
  channelName?: string;
  onConnected?: (channel: ChannelDTO) => void;
};

export type UseEmbeddedSignupResult = {
  phase: EmbeddedSignupPhase;
  config: MetaSignupConfigDTO | null;
  error: EmbeddedSignupError | null;
  /** Canal resultante. Existe también en `awaiting_pin`. */
  channel: ChannelDTO | null;
  onboardingStatus: MetaOnboardingStatus | null;
  /** Debe llamarse SÍNCRONAMENTE desde el onClick. No es `async` a propósito. */
  start: () => void;
  /** Envía el PIN de seis dígitos cuando la fase es `awaiting_pin`. */
  submitPin: (pin: string) => Promise<void>;
  submittingPin: boolean;
  /** Vuelve a `ready` (o `unavailable`) descartando el intento anterior. */
  reset: () => void;
};

export function useEmbeddedSignup({
  product,
  channelName,
  onConnected,
}: UseEmbeddedSignupOptions): UseEmbeddedSignupResult {
  const upsertChannel = useChannelStore((s) => s.upsertChannel);

  const popup = useMetaPopup(product);
  const { open: openPopup, clearWatchdog } = popup;

  const [phase, setPhase] = useState<EmbeddedSignupPhase>("preparing");
  const [error, setError] = useState<EmbeddedSignupError | null>(null);
  const [channel, setChannel] = useState<ChannelDTO | null>(null);
  const [submittingPin, setSubmittingPin] = useState(false);

  const codeRef = useRef<string | null>(null);
  const sessionRef = useRef<{
    phone_number_id: string;
    waba_id: string;
    business_id?: string;
  } | null>(null);
  const listenerRef = useRef<((event: MessageEvent) => void) | null>(null);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settledRef = useRef(false);
  /** Evita `setState` sobre un componente desmontado tras un POST en vuelo. */
  const mountedRef = useRef(true);

  const clearAttempt = useCallback(() => {
    if (listenerRef.current !== null) {
      window.removeEventListener("message", listenerRef.current);
      listenerRef.current = null;
    }
    if (graceTimerRef.current !== null) {
      clearTimeout(graceTimerRef.current);
      graceTimerRef.current = null;
    }
    clearWatchdog();
    codeRef.current = null;
    sessionRef.current = null;
    // Depende del callback ESTABLE, no del objeto que devuelve el hook: ese es
    // nuevo en cada render, y con él `clearAttempt` cambiaría de identidad,
    // re-disparando el efecto que lo usa y borrando listeners a cada render
  }, [clearWatchdog]);

  // Montaje y desmontaje, y NADA más: la limpieza va aquí y en el finally de
  // cada intento. Sin esto, tres intentos dejan tres listeners vivos.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearAttempt();
    };
  }, [clearAttempt]);

  /**
   * La fase espeja el estado de la base mientras no hay intento en curso. Una
   * vez arranca el popup, la máquina de este flujo manda.
   */
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

  // ------------------------------------------------------------ resolución
  const settle = useCallback(
    (next: EmbeddedSignupPhase, failure: EmbeddedSignupError | null) => {
      if (settledRef.current) return;
      settledRef.current = true;
      clearAttempt();
      if (!mountedRef.current) return;
      setError(failure);
      setPhase(next);
    },
    [clearAttempt],
  );

  /**
   * Envía el POST. Solo se llama cuando `code` y `sessionInfo` están los dos, o
   * desde el vencimiento de la gracia, que ya comprobó que hay `sessionInfo`.
   */
  const submit = useCallback(async () => {
    const code = codeRef.current;
    const session = sessionRef.current;
    if (code === null || session === null || settledRef.current) return;

    settledRef.current = true;
    if (mountedRef.current) setPhase("exchanging");

    const payload: MetaEmbeddedSignupDTO = {
      code,
      waba_id: session.waba_id,
      phone_number_id: session.phone_number_id,
      ...(session.business_id !== undefined ? { business_id: session.business_id } : {}),
      ...(channelName !== undefined && channelName.trim() !== ""
        ? { name: channelName.trim() }
        : {}),
    };

    try {
      const created = await completeMetaSignup(payload);
      clearAttempt();
      upsertChannel(created);
      if (!mountedRef.current) return;
      setChannel(created);
      setError(null);
      // El canal EXISTE aunque falte el PIN: el backend no tumba la conexión por
      // eso, devuelve 201 con el sub-estado. De ahí sale el id que necesita el
      // endpoint de registro.
      setPhase(
        created.onboarding?.status === "awaiting_registration" ? "awaiting_pin" : "success",
      );
      onConnected?.(created);
    } catch (err) {
      clearAttempt();
      if (!mountedRef.current) return;
      const failureCode = isHttpError(err) ? err.code : "channels/signup_failed";
      // `meta_signup_disabled` no es un fallo del intento: es capacidad ausente
      setPhase(failureCode === "channels/meta_signup_disabled" ? "unavailable" : "error");
      setError({ code: failureCode, message: errorMessage(err, "No se pudo conectar el canal") });
    }
  }, [channelName, clearAttempt, onConnected, upsertChannel]);

  /**
   * Convergencia de las dos fuentes asíncronas: se llama desde AMBAS y solo
   * dispara cuando las dos han llegado, en cualquier orden.
   */
  const tryComplete = useCallback(() => {
    if (codeRef.current === null || sessionRef.current === null) return;
    void submit();
  }, [submit]);

  // ------------------------------------------------------------------ start
  /**
   * NO es `async`, y eso es la decisión de diseño más importante del hook: entre
   * el clic del usuario y `FB.login` no puede haber ni un `await`.
   */
  const start = useCallback(() => {
    clearAttempt();
    settledRef.current = false;
    setChannel(null);
    setError(null);
    setPhase("popup_open");

    openPopup({
      // El listener va ANTES de FB.login: el popup puede mandar su FINISH antes
      // de que el callback del SDK dispare, y ese mensaje no se puede perder.
      beforeOpen: () => {
        const listener = (event: MessageEvent) => {
          if (!isTrustedMetaOrigin(event.origin)) return;
          const message = parseWaSignupMessage(event.data);
          if (message === null) return;

          if (message.event === "FINISH") {
            const data = message.data ?? {};
            if (typeof data.phone_number_id === "string" && typeof data.waba_id === "string") {
              sessionRef.current = {
                phone_number_id: data.phone_number_id,
                waba_id: data.waba_id,
                ...(typeof data.business_id === "string"
                  ? { business_id: data.business_id }
                  : {}),
              };
              tryComplete();
            }
            return;
          }

          if (message.event === "CANCEL") {
            settle("cancelled", null);
            return;
          }

          if (message.event === "ERROR") {
            settle("error", {
              code: "meta/popup_error",
              message:
                message.data?.error_message ??
                "Meta reportó un problema durante la autorización. Vuelve a intentarlo.",
            });
          }
        };
        listenerRef.current = listener;
        window.addEventListener("message", listener);
      },
      onResult: (result) => {
        if (result.outcome === "blocked") {
          settle("popup_blocked", null);
          return;
        }
        if (result.outcome === "cancelled") {
          settle("cancelled", null);
          return;
        }

        codeRef.current = result.code;
        // Si el `sessionInfo` ya llegó, `tryComplete` envía ahora mismo. Si no,
        // se le dan 8 segundos: `waba_id` y `phone_number_id` son OBLIGATORIOS
        // en el DTO, así que sin ellos no hay POST posible. Preferimos un error
        // explicado a un 422 garantizado.
        graceTimerRef.current = setTimeout(() => {
          if (sessionRef.current === null) {
            console.warn(
              "[meta-signup] El code llegó pero el sessionInfo no en 8 s: el popup no emitió FINISH.",
            );
            settle("error", {
              code: "meta/session_info_missing",
              message:
                "Autorizaste en Meta pero no pudimos leer los datos del número. Vuelve a intentarlo y espera a que la ventana termine sola.",
            });
            return;
          }
          void submit();
        }, SESSION_INFO_GRACE_MS);
        tryComplete();
      },
    });
  }, [clearAttempt, openPopup, settle, submit, tryComplete]);

  // -------------------------------------------------------------- PIN (409)
  const submitPin = useCallback(
    async (pin: string) => {
      if (channel === null || submittingPin) return;
      setSubmittingPin(true);
      try {
        const updated = await registerMetaPhoneNumber(channel.id, pin);
        upsertChannel(updated);
        if (!mountedRef.current) return;
        setChannel(updated);
        setError(null);
        setPhase("success");
        onConnected?.(updated);
      } catch (err) {
        if (!mountedRef.current) return;
        setError({
          code: isHttpError(err) ? err.code : "channels/meta_pin_invalid",
          message: errorMessage(err, "No se pudo verificar el PIN"),
        });
      } finally {
        if (mountedRef.current) setSubmittingPin(false);
      }
    },
    [channel, onConnected, submittingPin, upsertChannel],
  );

  const reset = useCallback(() => {
    clearAttempt();
    settledRef.current = false;
    setChannel(null);
    setError(null);
    setPhase(popup.ready ? "ready" : "unavailable");
  }, [clearAttempt, popup.ready]);

  return {
    phase,
    config: popup.config,
    error,
    channel,
    onboardingStatus: (channel?.onboarding?.status as MetaOnboardingStatus | undefined) ?? null,
    start,
    submitPin,
    submittingPin,
    reset,
  };
}
