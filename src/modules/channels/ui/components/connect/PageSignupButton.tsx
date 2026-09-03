"use client";

import { useEffect, useRef } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import type { ChannelDTO } from "@/modules/channels/domain/channel";
import {
  pageSignupProduct,
  type ChannelProvider,
} from "@/modules/channels/domain/channel-providers";
import {
  IN_PROGRESS_PHASES,
  TERMINAL_PHASES,
  type EmbeddedSignupPhase,
  type SignupError,
} from "@/modules/channels/domain/meta-signup";
import { usePageSignup } from "@/modules/channels/infrastructure/hooks/use-page-signup";
import {
  CancelledNotice,
  ErrorNotice,
  PopupBlockedNotice,
  UnavailableNotice,
  focusAfterTerminal,
  isConfigUnreachable,
  renderProgress,
} from "./EmbeddedSignupButton";
import { ManualCredentialsFallback } from "./ManualCredentialsFallback";
import { PageAssetPicker } from "./PageAssetPicker";

/**
 * Botón de alta de Instagram y Messenger (F7).
 *
 * Componente aparte del de WhatsApp, y no uno con dos flujos dentro: el paso de
 * elegir activo no existe allí, y el PIN no existe aquí. Lo que sí comparten
 * —los avisos, el indicador de progreso y la regla del foco— se importa, para
 * que el mismo fallo no se explique de dos formas distintas según el canal.
 *
 * Mantiene las dos invariantes del otro botón: nace deshabilitado hasta `ready`
 * (el SDK se precarga porque `FB.login` debe ser síncrono) y devuelve el foco
 * en cada transición terminal, porque al cerrarse el popup el foco estaba en
 * una ventana que ya no existe.
 */
export function PageSignupButton({
  provider,
  onConnected,
  onManualCreated,
  intro,
}: {
  provider: ChannelProvider;
  onConnected: (channel: ChannelDTO) => void;
  onManualCreated?: () => void;
  intro?: React.ReactNode;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const product = pageSignupProduct(provider);
  const { phase, error, assets, connecting, start, choose, reset, retryConfig } = usePageSignup({
    product,
    onConnected,
  });

  useEffect(() => {
    focusAfterTerminal(phase, error, { button: buttonRef.current, alert: alertRef.current });
  }, [phase, error]);

  return (
    <div className="space-y-5">
      <div className="border-border space-y-5 rounded-lg border p-4 md:p-6">
        {intro}

        <div>
          {phase === "choosing_asset" ? (
            <PageAssetPicker
              assets={assets}
              product={product}
              connecting={connecting}
              onChoose={choose}
            />
          ) : (
            <PrimaryAction
              phase={phase}
              error={error}
              buttonRef={buttonRef}
              label={provider.label}
              start={start}
              reset={reset}
              retryConfig={retryConfig}
            />
          )}
        </div>

        <div role="status" aria-live="polite" className="space-y-4">
          {IN_PROGRESS_PHASES.includes(phase) && renderProgress(phase, product)}
        </div>

        <div
          ref={alertRef}
          role="alert"
          aria-live="assertive"
          tabIndex={-1}
          className="space-y-4 outline-none"
        >
          {phase === "popup_blocked" && <PopupBlockedNotice />}
          {/* `mayBeMetaError`: aquí el popup no manda `postMessage`, así que una
              cancelación y un fallo de Meta son indistinguibles — ver el
              docblock de `CancelledNotice`. */}
          {phase === "cancelled" && <CancelledNotice mayBeMetaError />}
          {phase === "error" && <ErrorNotice error={error} />}
          {phase === "unavailable" && <UnavailableNotice error={error} />}
        </div>
      </div>

      <ManualCredentialsFallback
        prominent={phase === "unavailable"}
        onCreated={onManualCreated ?? (() => undefined)}
      />
    </div>
  );
}

function PrimaryAction({
  phase,
  error,
  buttonRef,
  label,
  start,
  reset,
  retryConfig,
}: {
  phase: EmbeddedSignupPhase;
  error: SignupError | null;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  label: string;
  start: () => void;
  reset: () => void;
  retryConfig: () => void;
}) {
  if (phase === "preparing") {
    return (
      <Button ref={buttonRef} size="lg" disabled>
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        Preparando la conexión…
      </Button>
    );
  }

  if (phase === "popup_open" || phase === "exchanging") {
    return (
      <Button ref={buttonRef} size="lg" disabled>
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        Conectando…
      </Button>
    );
  }

  if (TERMINAL_PHASES.includes(phase) && phase !== "unavailable") {
    return (
      <Button
        ref={buttonRef}
        size="lg"
        onClick={() => {
          // Igual que el botón de WhatsApp: reintentar ES reabrir el popup. Solo
          // `reset` dejaba la fase en `ready` y obligaba a un segundo clic. Los
          // dos van en el mismo tick: `start` sigue siendo síncrona en el gesto.
          reset();
          start();
        }}
      >
        <RefreshCw aria-hidden="true" className="size-4" />
        Volver a intentar
      </Button>
    );
  }

  if (phase === "unavailable" && isConfigUnreachable(error)) {
    return (
      <Button ref={buttonRef} size="lg" variant="outline" onClick={retryConfig}>
        <RefreshCw aria-hidden="true" className="size-4" />
        Reintentar la conexión
      </Button>
    );
  }

  return (
    <Button ref={buttonRef} size="lg" disabled={phase === "unavailable"} onClick={start}>
      Conectar {label}
    </Button>
  );
}
