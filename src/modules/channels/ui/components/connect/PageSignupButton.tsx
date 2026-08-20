"use client";

import { useEffect, useRef } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import type { ChannelDTO } from "@/modules/channels/domain/channel";
import type { ChannelProvider } from "@/modules/channels/domain/channel-providers";
import { usePageSignup } from "@/modules/channels/infrastructure/hooks/use-page-signup";
import {
  CancelledNotice,
  ErrorNotice,
  IN_PROGRESS,
  PopupBlockedNotice,
  TERMINAL,
  UnavailableNotice,
  renderProgress,
} from "./EmbeddedSignupButton";
import { ManualCredentialsFallback } from "./ManualCredentialsFallback";
import { PageAssetPicker } from "./PageAssetPicker";

/**
 * Botón de alta de Instagram y Messenger (F7).
 *
 * Componente aparte del de WhatsApp, y no uno con dos flujos dentro: el paso de
 * elegir activo no existe allí, y el PIN no existe aquí. Lo que sí comparten
 * —los avisos y el indicador de progreso— se importa, para que el mismo fallo
 * no se explique de dos formas distintas según el canal.
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
  const product = provider.meta_product === "instagram" ? "instagram" : "messenger";
  const { phase, error, assets, connecting, start, choose, reset } = usePageSignup({
    product,
    onConnected,
  });

  useEffect(() => {
    if (TERMINAL.includes(phase)) buttonRef.current?.focus();
  }, [phase]);

  return (
    <div className="space-y-5">
      <div className="border-border space-y-5 rounded-lg border p-4 md:p-6">
        {intro}

        <div>
          {phase === "choosing_asset" ? (
            <PageAssetPicker assets={assets} connecting={connecting} onChoose={choose} />
          ) : (
            <PrimaryAction
              phase={phase}
              buttonRef={buttonRef}
              label={provider.label}
              start={start}
              reset={reset}
            />
          )}
        </div>

        <div role="status" aria-live="polite" className="space-y-4">
          {IN_PROGRESS.includes(phase) && renderProgress(phase)}
        </div>

        <div role="alert" aria-live="assertive" className="space-y-4">
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
  buttonRef,
  label,
  start,
  reset,
}: {
  phase: string;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  label: string;
  start: () => void;
  reset: () => void;
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

  if (TERMINAL.includes(phase as never) && phase !== "unavailable") {
    return (
      <Button ref={buttonRef} size="lg" onClick={reset}>
        <RefreshCw aria-hidden="true" className="size-4" />
        Volver a intentar
      </Button>
    );
  }

  return (
    <Button ref={buttonRef} size="lg" disabled={phase === "unavailable"} onClick={start}>
      Conectar {label}
    </Button>
  );
}
