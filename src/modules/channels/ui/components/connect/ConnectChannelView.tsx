"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { StepIndicator } from "@/shared/components/ui/step-indicator";
import type { ChannelDTO } from "@/modules/channels/domain/channel";
import type { ChannelProvider } from "@/modules/channels/domain/channel-providers";
import { EmbeddedSignupButton } from "./EmbeddedSignupButton";
import { ConnectSuccess } from "./ConnectSuccess";
import { PrerequisitesChecklist } from "./PrerequisitesChecklist";
import { ProviderGallery } from "./ProviderGallery";
import { QrPairingPanel } from "./QrPairingPanel";

/**
 * `/settings/channels/connect` — el wizard de cuatro pasos.
 *
 * El estado del wizard es **efímero a propósito**: recargar en mitad del paso 3
 * vuelve al paso 1. No es un descuido. El `code` de autorización de Meta vive 30
 * segundos y es de un solo uso, así que no se persiste en `localStorage`, ni en
 * un store, ni en la URL; y sin el `code`, retomar el paso 3 no significaría
 * nada. Que quede escrito para que no se reporte como bug.
 */
const STEPS = ["Canal", "Requisitos", "Conexión", "Listo"] as const;

export function ConnectChannelView() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [provider, setProvider] = useState<ChannelProvider | null>(null);
  const [channelName, setChannelName] = useState("");
  const [connected, setConnected] = useState<ChannelDTO | null>(null);

  const goToSuccess = (channel: ChannelDTO) => {
    setConnected(channel);
    setStep(3);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" className="-ml-3 w-fit text-muted-foreground">
        <Link href="/settings/channels">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Canales
        </Link>
      </Button>

      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{title(step, provider)}</h1>
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
          <ProviderGallery selected={provider} onSelect={setProvider} />
          <div className="max-w-sm space-y-1.5">
            <label htmlFor="channel-name" className="text-sm font-medium">
              ¿Cómo quieres llamarlo?
            </label>
            <Input
              id="channel-name"
              value={channelName}
              placeholder="Ventas"
              onChange={(event) => setChannelName(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Solo lo ven tus agentes, para distinguirlo de otros números. Puedes cambiarlo después.
            </p>
          </div>
          <Button disabled={provider === null} onClick={() => setStep(1)}>
            Continuar
          </Button>
        </div>
      )}

      {step === 1 && provider !== null && (
        <PrerequisitesChecklist provider={provider} onContinue={() => setStep(2)} />
      )}

      {step === 2 &&
        provider !== null &&
        (provider.connect_strategy === "qr" ? (
          <QrPairingPanel channelName={channelName} onConnected={goToSuccess} />
        ) : (
          <EmbeddedSignupButton
            provider={provider}
            channelName={channelName}
            onConnected={goToSuccess}
            // El camino manual no expone el canal creado (`ChannelForm.onSuccess`
            // no lo devuelve y su lógica no se toca), así que se cierra el wizard
            // llevando al listado, que ya refresca desde el store
            onManualCreated={() => router.push("/settings/channels")}
          />
        ))}

      {step === 3 && connected !== null && <ConnectSuccess channel={connected} />}
    </div>
  );
}

function title(step: number, provider: ChannelProvider | null): string {
  if (step === 0) return "Conectar un canal";
  if (step === 1) return "Antes de empezar";
  if (step === 2) {
    return provider?.connect_strategy === "qr" ? "Vincula tu WhatsApp" : "Conecta tu WhatsApp";
  }
  return "Todo listo";
}

function subtitle(step: number, provider: ChannelProvider | null): string {
  if (step === 0) return "Elige por dónde quieres atender a tus clientes.";
  if (step === 1) {
    return "Revisa estos puntos. Si algo falta, es mejor saberlo ahora que a mitad del proceso.";
  }
  if (step === 2) {
    return provider?.connect_strategy === "qr"
      ? "Escanea el código con la app de WhatsApp de tu celular."
      : "Se abrirá una ventana de Meta. Autoriza ahí y nosotros hacemos el resto.";
  }
  return "Tu canal quedó conectado y ya está recibiendo mensajes.";
}
