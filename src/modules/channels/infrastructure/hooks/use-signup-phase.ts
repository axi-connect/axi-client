"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

import type { EmbeddedSignupPhase, SignupError } from "@/modules/channels/domain/meta-signup";
import type { UseMetaPopupResult } from "./use-meta-popup";

export type UseSignupPhaseResult = {
  phase: EmbeddedSignupPhase;
  setPhase: Dispatch<SetStateAction<EmbeddedSignupPhase>>;
  error: SignupError | null;
  setError: Dispatch<SetStateAction<SignupError | null>>;
  /**
   * `true` mientras el componente está montado. Todo `setState` que siga a un
   * `await` —o al watchdog, que dispara hasta 180 s después— pasa por aquí.
   */
  mountedRef: React.RefObject<boolean>;
};

/**
 * Lo que `useEmbeddedSignup` y `usePageSignup` tenían escrito dos veces, byte a
 * byte: el efecto de montaje con `mountedRef`, y el efecto que espeja
 * `popup.status`/`popup.error` en la fase mientras no hay intento en curso.
 *
 * La fase espeja el estado de la base (SDK + configuración) solo desde
 * `preparing`/`unavailable`: una vez arranca el popup, la máquina de cada flujo
 * manda y la base no puede pisarla.
 *
 * `onUnmount` es la limpieza propia del flujo (listeners, temporizadores). Va
 * por ref para que cambiar su identidad no re-dispare el efecto de montaje.
 */
export function useSignupPhase(
  popup: Pick<UseMetaPopupResult, "status" | "error" | "clearWatchdog">,
  onUnmount?: () => void,
): UseSignupPhaseResult {
  const { clearWatchdog } = popup;
  const [phase, setPhase] = useState<EmbeddedSignupPhase>("preparing");
  const [error, setError] = useState<SignupError | null>(null);
  const mountedRef = useRef(true);
  const onUnmountRef = useRef(onUnmount);
  onUnmountRef.current = onUnmount;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearWatchdog();
      onUnmountRef.current?.();
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

  return { phase, setPhase, error, setError, mountedRef };
}
