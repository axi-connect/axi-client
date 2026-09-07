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
import type { MetaOnboardingMode } from "@/modules/channels/domain/meta-signup";
import { EmbeddedSignupButton } from "./EmbeddedSignupButton";
import { PageSignupButton } from "./PageSignupButton";
import { ManualCredentialsFallback } from "./ManualCredentialsFallback";
import { ConnectSuccess } from "./ConnectSuccess";
import { PrerequisitesChecklist } from "./PrerequisitesChecklist";
import { ProviderGallery } from "./ProviderGallery";
import { WhatsAppNumberModeStep } from "./WhatsAppNumberModeStep";

/**
 * El wizard de conexión de canal, SIN cromo de página: lo monta
 * `ConnectChannelView` en `/settings/channels/connect` (con su enlace de vuelta
 * y su `h1`) y el paso «WhatsApp» del onboarding (dentro de su propio marco,
 * con `h2`). Es un componente y no dos copias porque el flujo con Meta —popup,
 * `code` de 30 segundos, PIN— es el mismo en ambos sitios y tiene que cambiar
 * en uno solo.
 *
 * Los pasos son NOMBRES, no números: WhatsApp tiene uno más que los demás
 * («Tu número», F1: ¿el número ya está en la app del celular?), y con índices
 * a mano ese paso extra desplazaba todos los demás en cada `if`.
 *
 * El estado es **efímero a propósito**: recargar en mitad de la conexión vuelve
 * al principio. El `code` de autorización de Meta vive 30 segundos y es de un
 * solo uso, así que no se persiste en `localStorage`, ni en un store, ni en la
 * URL; y sin el `code`, retomar la conexión no significaría nada.
 */
type Stage = "provider" | "mode" | "prerequisites" | "connect" | "success";

const STAGE_LABELS: Record<Stage, string> = {
  provider: "Canal",
  mode: "Tu número",
  prerequisites: "Requisitos",
  connect: "Conexión",
  success: "Listo",
};

/** Solo WhatsApp pregunta por el número: Instagram y Messenger no tienen dos caminos. */
function hasModeStage(provider: ChannelProvider | null): boolean {
  return provider?.meta_product === "whatsapp";
}

function stagesFor(provider: ChannelProvider | null, single: boolean): readonly Stage[] {
  return [
    ...(single ? [] : (["provider"] as const)),
    ...(hasModeStage(provider) ? (["mode"] as const) : []),
    "prerequisites",
    "connect",
    "success",
  ];
}

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
  /** El canal quedó conectado (paso final). El flujo sigue mostrando el éxito. */
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
  const [provider, setProvider] = useState<ChannelProvider | null>(single);
  // Con un solo proveedor el flujo arranca ya elegido, en su primer paso real
  const [stage, setStage] = useState<Stage>(() =>
    single === null ? "provider" : hasModeStage(single) ? "mode" : "prerequisites",
  );
  const [mode, setMode] = useState<MetaOnboardingMode | null>(null);
  const [connected, setConnected] = useState<ChannelDTO | null>(null);

  const stages = stagesFor(provider, single !== null);
  const stageIndex = Math.max(0, stages.indexOf(stage));

  const goToSuccess = (channel: ChannelDTO) => {
    setConnected(channel);
    setStage("success");
    onConnected?.(channel);
  };

  function afterProvider(chosen: ChannelProvider | null) {
    setStage(hasModeStage(chosen) ? "mode" : "prerequisites");
  }

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
            mode={mode ?? undefined}
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
          {title(stage, provider)}
        </Heading>
        <p className="text-muted-foreground">{subtitle(stage, provider)}</p>
      </header>

      <StepIndicator
        steps={stages.map((name) => STAGE_LABELS[name])}
        current={stageIndex}
        ariaLabel="Progreso de la conexión"
        // Volver atrás sí, saltar adelante no: el `StepIndicator` solo permite
        // pulsar pasos ya completados.
        onStepClick={
          connected === null
            ? (target) => {
                const destination = stages[Math.min(target, stageIndex)];
                if (destination !== undefined) setStage(destination);
              }
            : undefined
        }
      />

      {stage === "provider" && (
        <div className="space-y-6">
          {/* Aquí NO se pide el nombre del canal. El alta ya lo pone —el número o
              la página que se acaba de autorizar— y el paso final deja cambiarlo
              con el mismo formulario del detalle. */}
          <ProviderGallery selected={provider} onSelect={setProvider} providers={providers} />
          <Button disabled={provider === null} onClick={() => afterProvider(provider)}>
            Continuar
          </Button>
        </div>
      )}

      {stage === "mode" && provider !== null && (
        <WhatsAppNumberModeStep
          value={mode}
          onChange={setMode}
          onContinue={() => setStage("prerequisites")}
        />
      )}

      {stage === "prerequisites" && provider !== null && (
        <PrerequisitesChecklist
          provider={provider}
          mode={mode ?? undefined}
          onContinue={() => setStage("connect")}
        />
      )}

      {stage === "connect" && provider !== null && renderConnectStep(provider)}

      {stage === "success" && connected !== null && <ConnectSuccess channel={connected} />}
    </div>
  );
}

function title(stage: Stage, provider: ChannelProvider | null): string {
  switch (stage) {
    case "provider":
      return "Conectar un canal";
    case "mode":
      return "¿Ese número ya se usa en la app WhatsApp Business?";
    case "prerequisites":
      return "Antes de empezar";
    case "connect":
      if (provider === null) return "Conecta tu canal";
      // El botón de Meta dejó de ser solo de WhatsApp: Instagram y Messenger pasan
      // por aquí, y titular su pantalla "Conecta tu WhatsApp" es un error visible.
      return `Conecta ${provider.label}`;
    case "success":
      return "Todo listo";
  }
}

function subtitle(stage: Stage, provider: ChannelProvider | null): string {
  switch (stage) {
    case "provider":
      return "Elige por dónde quieres atender a tus clientes.";
    case "mode":
      return "Elige según cómo atiendes hoy. Podrás conectar otros números después.";
    case "prerequisites":
      return "Revisa estos puntos. Si algo falta, es mejor saberlo ahora que a mitad del proceso.";
    case "connect":
      if (provider === null) return "";
      if (signupFlavor(provider) === "manual") {
        return "Este canal se conecta con las credenciales de tu app de Meta.";
      }
      return "Se abrirá una ventana de Meta. Autoriza ahí y nosotros hacemos el resto.";
    case "success":
      return "Tu canal quedó conectado y ya está recibiendo mensajes.";
  }
}
