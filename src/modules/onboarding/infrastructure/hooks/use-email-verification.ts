"use client";

import { useEffect, useRef, useState } from "react";

import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { verifyEmail } from "@/modules/onboarding/infrastructure/services/onboarding-service.adapter";

export type EmailVerificationState =
  | { status: "missing" }
  | { status: "verifying" }
  | { status: "verified" }
  | { status: "expired" }
  | { status: "error"; message: string };

const FALLBACK_MESSAGE = "No pudimos confirmar tu correo. Inténtalo de nuevo en un momento.";

function initialState(token: string): EmailVerificationState {
  return token.length === 0 ? { status: "missing" } : { status: "verifying" };
}

function failureState(cause: unknown): EmailVerificationState {
  if (isHttpError(cause) && cause.is(API_ERROR_CODES.verificationExpired)) return { status: "expired" };
  return { status: "error", message: errorMessage(cause, FALLBACK_MESSAGE) };
}

/**
 * Consume el token del enlace de verificación (`POST /public/onboarding/verify-email`)
 * y expone el resultado como estado.
 *
 * Es una **mutación de un solo uso**: el backend quema el token en la primera
 * llamada y responde `410` a la segunda. Por eso el hook garantiza dos cosas
 * que un `useEffect` con flag `cancelled` no puede garantizar a la vez:
 *
 * 1. **Una sola petición por token.** `sentRef` recuerda el token ya enviado;
 *    el efecto depende solo de `token`, así que ni el doble montaje de
 *    StrictMode ni ningún re-render del padre vuelven a llamar.
 * 2. **El resultado siempre se honra.** La promesa termina en `setState` pase
 *    lo que pase con los renders intermedios; el único guardián es
 *    `mountedRef`, para no escribir tras desmontar. Descartar la respuesta
 *    con un `cancelled` de limpieza dejaría el token consumido y la pantalla
 *    colgada en «verificando» (incidente 2026-09-07).
 *
 * Lo que dependa de la sesión (refrescarla para que `MeDto.email_verified`
 * cambie) no vive aquí: es reactivo a `useAuth().status` y lo orquesta la vista.
 */
export function useEmailVerification(token: string): EmailVerificationState {
  const [state, setState] = useState<EmailVerificationState>(() => initialState(token));
  const sentRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (token.length === 0) {
      setState({ status: "missing" });
      return;
    }
    if (sentRef.current === token) return;
    sentRef.current = token;
    setState({ status: "verifying" });

    verifyEmail(token)
      .then(() => {
        if (mountedRef.current) setState({ status: "verified" });
      })
      .catch((cause: unknown) => {
        if (mountedRef.current) setState(failureState(cause));
      });
  }, [token]);

  return state;
}
