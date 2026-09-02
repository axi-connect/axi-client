"use client";

import { useState } from "react";

import { StepIndicator } from "@/shared/components/ui/step-indicator";
import { Button } from "@/shared/components/ui/button";
import type { ChannelDTO } from "@/modules/channels/domain/channel";
import {
  effectiveConnectStrategy,
  type ChannelProvider,
} from "@/modules/channels/domain/channel-providers";
import { EmbeddedSignupButton } from "./EmbeddedSignupButton";
import { PageSignupButton } from "./PageSignupButton";
import { ManualCredentialsFallback } from "./ManualCredentialsFallback";
import { ConnectSuccess } from "./ConnectSuccess";
import { PrerequisitesChecklist } from "./PrerequisitesChecklist";
import { ProviderGallery } from "./ProviderGallery";
import { QrPairingPanel } from "./QrPairingPanel";

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
  onConnected,
  onManualCreated,
}: {
  /** Dentro de otro marco: cabecera en `h2` y sin márgenes de página. */
  embedded?: boolean;
  /** El canal quedó conectado (paso 4). El flujo sigue mostrando el éxito. */
  onConnected?: (channel: ChannelDTO) => void;
  /**
   * El camino manual no devuelve el canal creado (`ChannelForm.onSuccess` no
   * lo expone): quien monta el flujo decide adónde ir.
   */
  onManualCreated: () => void;
}) {
  const [step, setStep] = useState(0);
  const [provider, setProvider] = useState<ChannelProvider | null>(null);
  const [connected, setConnected] = useState<ChannelDTO | null>(null);

  const goToSuccess = (channel: ChannelDTO) => {
    setConnected(channel);
    setStep(3);
    onConnected?.(channel);
  };

  function renderConnectStep() {
    if (provider === null) return null;
    const strategy = effectiveConnectStrategy(provider);

    if (strategy === "qr") {
      return <QrPairingPanel onConnected={goToSuccess} />;
    }
    if (strategy === "manual") {
      return (
        <ManualCredentialsFallback
          prominent
          kind={provider.kind === "instagram_dm" ? "instagram_dm" : "facebook_messenger"}
          onCreated={onManualCreated}
        />
      );
    }
    // Dos botones y no uno con dos flujos dentro: el popup de WhatsApp devuelve
    // los identificadores y el de páginas no, así que este último añade un paso
    // —elegir activo— que allí no existe, y no tiene el PIN que aquel sí pide.
    if (provider.meta_product === "instagram" || provider.meta_product === "messenger") {
      return <PageSignupButton provider={provider} onConnected={goToSuccess} onManualCreated={onManualCreated} />;
    }
    return <EmbeddedSignupButton provider={provider} onConnected={goToSuccess} onManualCreated={onManualCreated} />;
  }

  const Heading = embedded ? "h2" : "h1";

  return (
    <div className={embedded ? "space-y-6" : "space-y-6"}>
      <header>
        <Heading className={embedded ? "text-xl font-semibold tracking-tight" : "text-3xl font-semibold tracking-tight"}>
          {title(step, provider)}
        </Heading>
        <p className="text-muted-foreground">{subtitle(step, provider)}</p>
      </header>

      <StepIndicator
        steps={STEPS}
        current={step}
        ariaLabel="Progreso de la conexión"
        // Volver atrás sí, saltar adelante no: el `StepIndicator` solo permite
        // pulsar pasos ya completados
        onStepClick={connected === null ? setStep : undefined}
      />

      {step === 0 && (
        <div className="space-y-6">
          {/* Aquí NO se pide el nombre del canal. El alta ya lo pone —el número o
              la página que se acaba de autorizar— y el paso 4 deja cambiarlo con
              el mismo formulario del detalle. */}
          <ProviderGallery selected={provider} onSelect={setProvider} />
          <Button disabled={provider === null} onClick={() => setStep(1)}>
            Continuar
          </Button>
        </div>
      )}

      {step === 1 && provider !== null && <PrerequisitesChecklist provider={provider} onContinue={() => setStep(2)} />}

      {/* El paso 3 se elige por la estrategia EFECTIVA, que sale del registry: no
          hay un `if (kind === ...)` en esta vista. */}
      {step === 2 && provider !== null && renderConnectStep()}

      {step === 3 && connected !== null && <ConnectSuccess channel={connected} />}
    </div>
  );
}

function title(step: number, provider: ChannelProvider | null): string {
  if (step === 0) return "Conectar un canal";
  if (step === 1) return "Antes de empezar";
  if (step === 2) {
    if (provider === null) return "Conecta tu canal";
    const strategy = effectiveConnectStrategy(provider);
    if (strategy === "qr") return "Vincula tu WhatsApp";
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
    const strategy = effectiveConnectStrategy(provider);
    if (strategy === "qr") return "Escanea el código con la app de WhatsApp de tu celular.";
    if (strategy === "manual") {
      return "Este canal todavía se conecta con las credenciales de tu app de Meta. El botón llega pronto.";
    }
    return "Se abrirá una ventana de Meta. Autoriza ahí y nosotros hacemos el resto.";
  }
  return "Tu canal quedó conectado y ya está recibiendo mensajes.";
}
