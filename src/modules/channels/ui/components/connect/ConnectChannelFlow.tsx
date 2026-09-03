"use client";

import { useState } from "react";

import { StepIndicator } from "@/shared/components/ui/step-indicator";
import { Button } from "@/shared/components/ui/button";
import type { ChannelDTO, ChannelKind } from "@/modules/channels/domain/channel";
import {
  connectableProviders,
  manualKind,
  signupFlavor,
  type ChannelProvider,
} from "@/modules/channels/domain/channel-providers";
import { EmbeddedSignupButton } from "./EmbeddedSignupButton";
import { PageSignupButton } from "./PageSignupButton";
import { ManualCredentialsFallback } from "./ManualCredentialsFallback";
import { ConnectSuccess } from "./ConnectSuccess";
import { PrerequisitesChecklist } from "./PrerequisitesChecklist";
import { ProviderGallery } from "./ProviderGallery";

/**
 * El wizard de conexión de canal en cuatro pasos, SIN cromo de página: lo
 * monta `ConnectChannelView` en `/settings/channels/connect` (con su enlace de
 * vuelta y su `h1`) y el paso «WhatsApp» del onboarding (dentro de su propio
 * marco, con `h2`). Es un componente y no dos copias porque el flujo con Meta
 * —popup, `code` de 30 segundos, PIN— es el mismo en ambos sitios y tiene que
 * cambiar en uno solo.
 *
 * El estado es **efímero a propósito**: recargar en mitad del paso 3 vuelve al
 * paso 1. El `code` de autorización de Meta vive 30 segundos y es de un solo
 * uso, así que no se persiste en `localStorage`, ni en un store, ni en la URL;
 * y sin el `code`, retomar el paso 3 no significaría nada.
 */
const STEPS = ["Canal", "Requisitos", "Conexión", "Listo"] as const;

export function ConnectChannelFlow({
  embedded = false,
  only,
  onConnected,
  onManualCreated,
}: {
  /** Dentro de otro marco: cabecera en `h2` y sin márgenes de página. */
  embedded?: boolean;
  /**
   * Acota los proveedores ofrecidos. Con uno solo, el paso «Canal» se salta:
   * elegir entre uno no informa de nada. Lo usa el paso «WhatsApp» del
   * onboarding, que antes ofrecía Instagram y Messenger bajo un título que
   * decía «Conecta tu WhatsApp».
   */
  only?: readonly ChannelKind[];
  /** El canal quedó conectado (paso 4). El flujo sigue mostrando el éxito. */
  onConnected?: (channel: ChannelDTO) => void;
  /**
   * El camino manual no devuelve el canal creado (`ChannelForm.onSuccess` no
   * lo expone): quien monta el flujo decide adónde ir.
   */
  onManualCreated: () => void;
}) {
  const providers = connectableProviders().filter(
    (candidate) => only === undefined || only.includes(candidate.kind),
  );
  const single = providers.length === 1 ? providers[0] : null;
  // Los `useState` leen el valor inicial UNA vez: con un solo proveedor el
  // flujo arranca ya elegido y en «Requisitos»
  const firstStep = single === null ? 0 : 1;
  const [step, setStep] = useState(firstStep);
  const [provider, setProvider] = useState<ChannelProvider | null>(single);
  const [connected, setConnected] = useState<ChannelDTO | null>(null);

  const goToSuccess = (channel: ChannelDTO) => {
    setConnected(channel);
    setStep(3);
    onConnected?.(channel);
  };

  function renderConnectStep(current: ChannelProvider) {
    // Tres botones y no uno con tres flujos dentro: el popup de WhatsApp
    // devuelve los identificadores y el de páginas no, así que este último añade
    // un paso —elegir activo— que allí no existe, y no tiene el PIN que aquel sí
    // pide. Qué flujo toca lo decide `domain/`, no esta vista.
    switch (signupFlavor(current)) {
      case "manual":
        return (
          <ManualCredentialsFallback
            prominent
            kind={manualKind(current)}
            onCreated={onManualCreated}
          />
        );
      case "page":
        return (
          <PageSignupButton
            provider={current}
            onConnected={goToSuccess}
            onManualCreated={onManualCreated}
          />
        );
      case "whatsapp":
        return (
          <EmbeddedSignupButton
            provider={current}
            onConnected={goToSuccess}
            onManualCreated={onManualCreated}
          />
        );
    }
  }

  const Heading = embedded ? "h2" : "h1";

  return (
    <div className="space-y-6">
      <header>
        <Heading
          className={
            embedded ? "text-xl font-semibold tracking-tight" : "text-3xl font-semibold tracking-tight"
          }
        >
          {title(step, provider)}
        </Heading>
        <p className="text-muted-foreground">{subtitle(step, provider)}</p>
      </header>

      <StepIndicator
        steps={STEPS}
        current={step}
        ariaLabel="Progreso de la conexión"
        // Volver atrás sí, saltar adelante no: el `StepIndicator` solo permite
        // pulsar pasos ya completados. Y nunca por debajo del primero real.
        onStepClick={
          connected === null ? (target) => setStep(Math.max(target, firstStep)) : undefined
        }
      />

      {step === 0 && (
        <div className="space-y-6">
          {/* Aquí NO se pide el nombre del canal. El alta ya lo pone —el número o
              la página que se acaba de autorizar— y el paso 4 deja cambiarlo con
              el mismo formulario del detalle. */}
          <ProviderGallery selected={provider} onSelect={setProvider} providers={providers} />
          <Button disabled={provider === null} onClick={() => setStep(1)}>
            Continuar
          </Button>
        </div>
      )}

      {step === 1 && provider !== null && (
        <PrerequisitesChecklist provider={provider} onContinue={() => setStep(2)} />
      )}

      {step === 2 && provider !== null && renderConnectStep(provider)}

      {step === 3 && connected !== null && <ConnectSuccess channel={connected} />}
    </div>
  );
}

function title(step: number, provider: ChannelProvider | null): string {
  if (step === 0) return "Conectar un canal";
  if (step === 1) return "Antes de empezar";
  if (step === 2) {
    if (provider === null) return "Conecta tu canal";
    // El botón de Meta dejó de ser solo de WhatsApp: Instagram y Messenger pasan
    // por aquí, y titular su pantalla "Conecta tu WhatsApp" es un error visible.
    return `Conecta ${provider.label}`;
  }
  return "Todo listo";
}

function subtitle(step: number, provider: ChannelProvider | null): string {
  if (step === 0) return "Elige por dónde quieres atender a tus clientes.";
  if (step === 1) {
    return "Revisa estos puntos. Si algo falta, es mejor saberlo ahora que a mitad del proceso.";
  }
  if (step === 2) {
    if (provider === null) return "";
    if (signupFlavor(provider) === "manual") {
      return "Este canal se conecta con las credenciales de tu app de Meta.";
    }
    return "Se abrirá una ventana de Meta. Autoriza ahí y nosotros hacemos el resto.";
  }
  return "Tu canal quedó conectado y ya está recibiendo mensajes.";
}
