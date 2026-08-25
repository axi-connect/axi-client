"use client";

import { useState } from "react";
import { ExternalLink, LoaderCircle, TriangleAlert } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { Button } from "@/shared/components/ui/button";
import type { IntegrationProviderDescriptor } from "@/modules/integrations/domain/integration-providers";
import { startIntegrationOAuth } from "@/modules/integrations/infrastructure/services/integrations-service.adapter";

/**
 * Paso «Conexión» por OAuth (PR8): un solo botón que pide la URL de
 * autorización al backend y navega hacia el proveedor. El proveedor redirige a
 * `/settings/integrations/connect/callback` cuando termina.
 *
 * Hoy ningún proveedor `oauth` está `available`, así que este panel queda
 * inerte detrás de las tarjetas `coming_soon` — pero el flip a `available` es
 * una línea del registry, no una vista nueva.
 */
export function OAuthConnectPanel({ provider }: { provider: IntegrationProviderDescriptor }) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scopesNote =
    provider.connect.strategy === "oauth" ? provider.connect.scopes_note : undefined;

  const start = async () => {
    setStarting(true);
    setError(null);
    try {
      const { authorize_url } = await startIntegrationOAuth(provider.kind);
      // No se re-habilita el botón: la página está navegando hacia el proveedor.
      window.location.assign(authorize_url);
    } catch (err) {
      setError(errorMessage(err, `No se pudo iniciar la conexión con ${provider.label}`));
      setStarting(false);
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-muted-foreground">
        Se abre {provider.label} para que autorices el acceso con tu propia sesión: axi nunca ve
        tu contraseña y tú decides qué permisos concedes.
      </p>
      {scopesNote !== undefined && (
        <p className="text-xs text-muted-foreground">{scopesNote}</p>
      )}

      {error !== null && (
        <div className="flex gap-2.5 rounded-md border border-destructive/40 bg-destructive/[0.08] p-3">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <Button onClick={() => void start()} disabled={starting}>
        {starting ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <ExternalLink aria-hidden="true" className="size-4" />
        )}
        {starting ? `Abriendo ${provider.label}…` : `Continuar con ${provider.label}`}
      </Button>
    </div>
  );
}
