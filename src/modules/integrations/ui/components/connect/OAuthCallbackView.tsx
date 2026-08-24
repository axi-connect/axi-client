"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CircleCheck, ExternalLink, RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  connectedWord,
  integrationProvider,
} from "@/modules/integrations/domain/integration-providers";
import { IntegrationProviderIcon } from "../IntegrationProviderIcon";

/**
 * `/settings/integrations/connect/callback` — el aterrizaje del alta OAuth
 * (F11/PR8): el proveedor redirige aquí con
 * `?provider=&status=ok|error&integration_id=&message=`. El backend ya hizo
 * TODO el trabajo en el intercambio del code; esta vista solo cuenta el
 * resultado y ofrece el siguiente paso — no llama a ninguna API.
 *
 * Cualquier combinación coja de parámetros (sin status, ok sin id) se trata
 * como error con reintento: llegar aquí a medias ya ES un fallo del flujo.
 */
export function OAuthCallbackView() {
  const searchParams = useSearchParams();
  const kind = searchParams.get("provider") ?? "";
  const status = searchParams.get("status");
  const integrationId = searchParams.get("integration_id");
  const message = searchParams.get("message");

  const provider = integrationProvider(kind);
  const succeeded = status === "ok" && integrationId !== null && integrationId !== "";

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
          <h1 className="text-3xl font-semibold tracking-tight">
            {succeeded ? "Todo listo" : "La conexión no se completó"}
          </h1>
          <p className="text-muted-foreground">
            {succeeded
              ? `Tu ${provider.noun.singular} quedó ${connectedWord(provider)}. Falta decirle a axi qué sincronizar.`
              : `${provider.label} no terminó de autorizar el acceso.`}
          </p>
        </div>
      </header>

      {succeeded ? (
        <>
          <div className="flex gap-3 rounded-lg border border-success/40 bg-success/[0.08] p-4">
            <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
            <div className="space-y-1">
              <p className="font-semibold">
                Tu {provider.noun.singular} de {provider.label} quedó {connectedWord(provider)}
              </p>
              <p className="text-muted-foreground">
                La autorización se guardó y la conexión está activa. El siguiente paso es
                configurar qué se sincroniza.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/settings/integrations/${integrationId}`}>
                Configurar y sincronizar
                <ExternalLink aria-hidden="true" className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/settings/integrations">Ver todas las integraciones</Link>
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/[0.08] p-4">
            <TriangleAlert
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-destructive"
            />
            <div className="space-y-1">
              <p className="font-semibold">No se pudo conectar {provider.label}</p>
              <p className="text-muted-foreground">
                {message !== null && message !== ""
                  ? message
                  : "La autorización se canceló o expiró antes de completarse. No se guardó nada: puedes intentarlo de nuevo."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/settings/integrations/connect?provider=${kind}`}>
                <RefreshCw aria-hidden="true" className="size-4" />
                Reintentar
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/settings/integrations">Volver a integraciones</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
