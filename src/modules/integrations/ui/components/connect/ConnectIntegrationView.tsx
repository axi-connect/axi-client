"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CircleCheck, ExternalLink } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { StepIndicator } from "@/shared/components/ui/step-indicator";
import { PrerequisitesChecklist } from "@/shared/components/prerequisites-checklist";
import type { IntegrationDTO } from "@/modules/integrations/domain/integration";
import {
  connectSubtitle,
  connectTitle,
  connectedWord,
  integrationProvider,
  prerequisitesSubtitle,
  successSubtitle,
  type IntegrationProviderDescriptor,
} from "@/modules/integrations/domain/integration-providers";
import { IntegrationProviderIcon } from "../IntegrationProviderIcon";
import { AccessTokenConnectPanel } from "./AccessTokenConnectPanel";
import { OAuthConnectPanel } from "./OAuthConnectPanel";

/**
 * `/settings/integrations/connect?provider=shopify` — wizard de TRES pasos
 * (Requisitos → Conexión → Listo), no los cuatro de canales: el proveedor se
 * eligió en la tarjeta de la galería y un paso "Proveedor" preguntaría dos
 * veces lo mismo.
 *
 * El paso «Conexión» se elige por la estrategia del registry (F8): formulario
 * generado desde el descriptor para `access_token`, botón de autorización para
 * `oauth`. No hay un `if (kind === "shopify")` en esta vista.
 *
 * El estado es efímero a propósito (patrón ConnectChannelView): el token es un
 * secreto y no se persiste en ningún sitio intermedio — recargar vuelve al
 * paso 1 y no hay nada que retomar.
 */
const STEPS = ["Requisitos", "Conexión", "Listo"] as const;

export function ConnectIntegrationView() {
  const searchParams = useSearchParams();
  const kind = searchParams.get("provider");
  // Lo desconocido cae al FALLBACK (`internal`), que no pasa este gate.
  const provider = kind === null ? null : integrationProvider(kind);

  const [step, setStep] = useState(0);
  const [connected, setConnected] = useState<IntegrationDTO | null>(null);

  if (provider === null || provider.availability !== "available") {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-muted-foreground">Ese proveedor no está disponible para conectar.</p>
        <Button asChild variant="outline">
          <Link href="/settings/integrations">Volver a integraciones</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" className="-ml-3 w-fit text-muted-foreground">
        <Link href="/settings/integrations">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Integraciones
        </Link>
      </Button>

      <header className="flex items-start gap-3">
        <IntegrationProviderIcon iconId={provider.icon_id} className={provider.brand_class} />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{title(step, provider)}</h1>
          <p className="text-muted-foreground">{subtitle(step, provider)}</p>
        </div>
      </header>

      <StepIndicator
        steps={STEPS}
        current={step}
        ariaLabel="Progreso de la conexión"
        onStepClick={connected === null ? setStep : undefined}
      />

      {step === 0 && (
        <PrerequisitesChecklist
          providerLabel={provider.label}
          items={provider.prerequisites}
          onContinue={() => setStep(1)}
        />
      )}
      {step === 1 &&
        (provider.connect.strategy === "access_token" ? (
          <AccessTokenConnectPanel
            provider={provider}
            config={provider.connect}
            onConnected={(integration) => {
              setConnected(integration);
              setStep(2);
            }}
          />
        ) : (
          <OAuthConnectPanel provider={provider} />
        ))}
      {step === 2 && connected !== null && (
        <SuccessStep provider={provider} integration={connected} />
      )}
    </div>
  );
}

function title(step: number, provider: IntegrationProviderDescriptor): string {
  if (step === 0) return `Antes de conectar ${provider.label}`;
  if (step === 1) return connectTitle(provider);
  return "Todo listo";
}

function subtitle(step: number, provider: IntegrationProviderDescriptor): string {
  if (step === 0) return prerequisitesSubtitle(provider);
  if (step === 1) return connectSubtitle(provider);
  return successSubtitle(provider);
}

/** Paso 3: el siguiente paso REAL es configurar qué sincronizar. */
function SuccessStep({
  provider,
  integration,
}: {
  provider: IntegrationProviderDescriptor;
  integration: IntegrationDTO;
}) {
  return (
    <div className="space-y-6">
      <div className="flex gap-3 rounded-lg border border-success/40 bg-success/[0.08] p-4">
        <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
        <div className="space-y-1">
          <p className="font-semibold">
            {integration.account_label ?? integration.external_account} quedó{" "}
            {connectedWord(provider)}
          </p>
          <p className="text-muted-foreground">
            Falta elegir qué ubicaciones suman al stock y qué colecciones se vuelven categorías,
            y lanzar la primera sincronización. Sin eso, el catálogo aún no se espeja.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/settings/integrations/${integration.id}`}>
            Configurar y sincronizar
            <ExternalLink aria-hidden="true" className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/settings/integrations">Ver todas las integraciones</Link>
        </Button>
      </div>
    </div>
  );
}
