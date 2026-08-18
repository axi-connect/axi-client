"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CircleCheck, ExternalLink, LoaderCircle, TriangleAlert } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { StepIndicator } from "@/shared/components/ui/step-indicator";
import type { IntegrationDTO } from "@/modules/integrations/domain/integration";
import {
  INTEGRATION_PROVIDERS,
  type IntegrationProviderDescriptor,
} from "@/modules/integrations/domain/integration-providers";
import { connectIntegration } from "@/modules/integrations/infrastructure/services/integrations-service.adapter";
import { useIntegrationsStore } from "@/modules/integrations/infrastructure/stores/integrations.store";
import { IntegrationProviderIcon } from "../IntegrationProviderIcon";

/**
 * `/settings/integrations/connect?provider=shopify` — wizard de TRES pasos
 * (Requisitos → Conexión → Listo), no los cuatro de canales: el proveedor se
 * eligió en la tarjeta de la galería y un paso "Proveedor" preguntaría dos
 * veces lo mismo.
 *
 * El estado es efímero a propósito (patrón ConnectChannelView): el token es un
 * secreto y no se persiste en ningún sitio intermedio — recargar vuelve al
 * paso 1 y no hay nada que retomar.
 */
const STEPS = ["Requisitos", "Conexión", "Listo"] as const;

export function ConnectIntegrationView() {
  const searchParams = useSearchParams();
  const kind = searchParams.get("provider");
  const provider =
    kind !== null && kind in INTEGRATION_PROVIDERS
      ? INTEGRATION_PROVIDERS[kind as keyof typeof INTEGRATION_PROVIDERS]
      : null;

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
          <p className="text-muted-foreground">{subtitle(step)}</p>
        </div>
      </header>

      <StepIndicator
        steps={STEPS}
        current={step}
        ariaLabel="Progreso de la conexión"
        onStepClick={connected === null ? setStep : undefined}
      />

      {step === 0 && <PrerequisitesStep provider={provider} onContinue={() => setStep(1)} />}
      {step === 1 && (
        <CredentialsStep
          provider={provider}
          onConnected={(integration) => {
            setConnected(integration);
            setStep(2);
          }}
        />
      )}
      {step === 2 && connected !== null && <SuccessStep integration={connected} />}
    </div>
  );
}

function title(step: number, provider: IntegrationProviderDescriptor): string {
  if (step === 0) return `Antes de conectar ${provider.label}`;
  if (step === 1) return `Conecta tu tienda de ${provider.label}`;
  return "Todo listo";
}

function subtitle(step: number): string {
  if (step === 0) {
    return "Estos pasos se hacen una sola vez en el admin de tu tienda. Si algo falta, es mejor saberlo ahora.";
  }
  if (step === 1) {
    return "Validamos las credenciales contra tu tienda antes de guardar nada.";
  }
  return "Tu tienda quedó conectada. Falta decirle a axi qué sincronizar.";
}

/**
 * Paso 1: checklist de requisitos (mismo dispositivo de UX que canales — el
 * abandono ocurre dentro del admin del proveedor, no en nuestra UI; las
 * casillas mueven el descubrimiento de los bloqueos a donde son baratos).
 */
function PrerequisitesStep({
  provider,
  onContinue,
}: {
  provider: IntegrationProviderDescriptor;
  onContinue: () => void;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const groupId = useId();
  const hintId = `${groupId}-hint`;

  const items = provider.prerequisites;
  const pending = items.filter((item) => checked[item.id] !== true).length;
  const allChecked = pending === 0;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border p-4 md:p-6">
        <ul className="divide-y divide-border/60">
          {items.map((item) => {
            const inputId = `${groupId}-${item.id}`;
            return (
              <li key={item.id} className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
                <input
                  id={inputId}
                  type="checkbox"
                  checked={checked[item.id] === true}
                  onChange={(event) =>
                    setChecked((prev) => ({ ...prev, [item.id]: event.target.checked }))
                  }
                  className="mt-0.5 size-4.5 shrink-0 accent-primary"
                />
                <div className="min-w-0 space-y-1">
                  <label htmlFor={inputId} className="cursor-pointer font-medium">
                    {item.label}
                  </label>
                  {item.critical === true ? (
                    <div className="flex gap-2.5 rounded-md border border-warning/40 bg-warning/[0.09] p-3">
                      <TriangleAlert
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-warning"
                      />
                      <p className="text-sm">{item.detail}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{item.detail}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={!allChecked}
          aria-describedby={allChecked ? undefined : hintId}
          onClick={onContinue}
        >
          Continuar
        </Button>
        {!allChecked && (
          <p id={hintId} className="text-sm text-muted-foreground">
            {pending === 1
              ? "Falta confirmar un punto para continuar."
              : `Faltan ${pending} puntos por confirmar.`}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Paso 2: TRES campos, no uno (hallazgo M7 de la auditoría del plan): el token
 * firma las llamadas y la clave secreta de API firma los webhooks — sin la
 * segunda, la tienda no puede avisarnos de los cambios.
 */
function CredentialsStep({
  provider,
  onConnected,
}: {
  provider: IntegrationProviderDescriptor;
  onConnected: (integration: IntegrationDTO) => void;
}) {
  const upsertIntegration = useIntegrationsStore((s) => s.upsertIntegration);
  const [shopDomain, setShopDomain] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    shopDomain.trim().length > 0 && accessToken.trim().length > 0 && apiSecret.trim().length > 0;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const integration = await connectIntegration({
        provider: provider.kind,
        external_account: shopDomain.trim(),
        credentials: {
          mode: "access_token",
          access_token: accessToken.trim(),
          api_secret: apiSecret.trim(),
        },
      });
      upsertIntegration(integration);
      onConnected(integration);
    } catch (err) {
      // El backend valida contra la tienda REAL: un 422 trae el motivo exacto
      // (token malo, permisos faltantes, moneda distinta) y se muestra tal cual.
      setError(errorMessage(err, "No se pudo conectar la tienda"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className="max-w-xl space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit && !submitting) void submit();
      }}
    >
      <Field
        id="shop-domain"
        label="Dominio de tu tienda"
        hint="El dominio .myshopify.com, no el de tu página pública. Está en Configuración → Dominios."
      >
        <Input
          id="shop-domain"
          value={shopDomain}
          placeholder="mi-tienda.myshopify.com"
          autoComplete="off"
          onChange={(event) => setShopDomain(event.target.value)}
        />
      </Field>

      <Field
        id="access-token"
        label="Token de acceso de Admin API"
        hint="Empieza por shpat_. Shopify lo muestra UNA sola vez al instalar la app."
      >
        <Input
          id="access-token"
          type="password"
          value={accessToken}
          placeholder="shpat_…"
          autoComplete="off"
          onChange={(event) => setAccessToken(event.target.value)}
        />
      </Field>

      <Field
        id="api-secret"
        label="Clave secreta de API"
        hint="Está en la misma pestaña de credenciales de tu app. Firma los avisos que tu tienda nos envía: sin ella no llegan los cambios de stock."
      >
        <Input
          id="api-secret"
          type="password"
          value={apiSecret}
          placeholder="shpss_…"
          autoComplete="off"
          onChange={(event) => setApiSecret(event.target.value)}
        />
      </Field>

      {error !== null && (
        <div className="flex gap-2.5 rounded-md border border-destructive/40 bg-destructive/[0.08] p-3">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <Button type="submit" disabled={!canSubmit || submitting}>
        {submitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
        {submitting ? "Validando con tu tienda…" : "Conectar tienda"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/** Paso 3: el siguiente paso REAL es configurar qué sincronizar. */
function SuccessStep({ integration }: { integration: IntegrationDTO }) {
  return (
    <div className="space-y-6">
      <div className="flex gap-3 rounded-lg border border-success/40 bg-success/[0.08] p-4">
        <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
        <div className="space-y-1">
          <p className="font-semibold">
            {integration.account_label ?? integration.external_account} quedó conectada
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
