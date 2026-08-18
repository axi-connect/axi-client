"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/core/lib/utils";
import type { GovernanceState } from "@/modules/integrations/domain/integration";
import {
  CAPABILITY_LABELS,
  visibleProviders,
  type IntegrationProviderDescriptor,
} from "@/modules/integrations/domain/integration-providers";
import { useIntegrationsStore } from "@/modules/integrations/infrastructure/stores/integrations.store";
import { IntegrationCard } from "./IntegrationCard";
import { IntegrationProviderIcon } from "./IntegrationProviderIcon";

/**
 * `/settings/integrations` — hermana de `/settings/channels` (F17 PR7).
 *
 * Dos secciones: lo CONECTADO (tarjetas con superficie de marca) y lo
 * DISPONIBLE (galería de proveedores, con los `coming_soon` visibles e
 * inertes: comunicar la hoja de ruta es información comercial útil).
 */
export function IntegrationsView() {
  const items = useIntegrationsStore((s) => s.items);
  const governance = useIntegrationsStore((s) => s.governance);
  const loading = useIntegrationsStore((s) => s.loading);
  const error = useIntegrationsStore((s) => s.error);
  const fetchIntegrations = useIntegrationsStore((s) => s.fetchIntegrations);

  useEffect(() => {
    void fetchIntegrations();
  }, [fetchIntegrations]);

  const connectedProviders = new Set(items.map((item) => item.provider));
  const available = visibleProviders().filter(
    (provider) => !connectedProviders.has(provider.kind),
  );

  // Regla 3 del contrato: este tri-estado lo DERIVA el backend. Solo el estado
  // "declarado pero sin conexión sana" pide acción, así que es el único banner.
  const broken =
    governance !== null &&
    (governance.catalog === "provider_declared_not_connected" ||
      governance.orders === "provider_declared_not_connected");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1 basis-80">
          <h1 className="text-3xl font-semibold tracking-tight">Integraciones</h1>
          <p className="text-muted-foreground">
            Conecta los sistemas donde vive tu negocio: catálogo, inventario y cobros.
          </p>
        </div>
        {items.length > 0 && (
          <Button variant="outline" onClick={() => void fetchIntegrations()}>
            <RefreshCw aria-hidden="true" className="size-4" />
            Actualizar
          </Button>
        )}
      </header>

      {broken && governance !== null && (
        <div className="flex gap-3 rounded-md border border-warning/40 bg-warning/[0.09] p-4">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-warning" />
          <div className="min-w-0 space-y-1">
            <p className="font-semibold">Hay un gobierno declarado sin conexión funcionando</p>
            <p className="text-muted-foreground">
              {governanceProblem(governance.catalog, governance.orders)} Mientras tanto, el
              catálogo no se actualiza desde la tienda. Reconecta o rota las credenciales para
              destrabarla.
            </p>
          </div>
        </div>
      )}

      {loading && items.length === 0 ? (
        <IntegrationsGridSkeleton />
      ) : error !== null ? (
        <div className="space-y-3 rounded-lg border border-border p-6 text-center">
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={() => void fetchIntegrations()}>
            <RefreshCw aria-hidden="true" className="size-4" />
            Reintentar
          </Button>
        </div>
      ) : (
        <>
          {items.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((integration) => (
                <IntegrationCard key={integration.id} integration={integration} />
              ))}
            </div>
          )}

          {available.length > 0 && (
            <section className="space-y-3">
              {items.length > 0 && (
                <h2 className="text-sm font-medium text-muted-foreground">Disponibles</h2>
              )}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {available.map((provider) => (
                  <AvailableProviderCard key={provider.kind} provider={provider} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/** Galería de alta: el proveedor se elige AQUÍ, no en un paso del wizard. */
function AvailableProviderCard({ provider }: { provider: IntegrationProviderDescriptor }) {
  const comingSoon = provider.availability === "coming_soon";

  const body = (
    <>
      <div className="relative flex items-start gap-3">
        <IntegrationProviderIcon iconId={provider.icon_id} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-semibold">{provider.label}</span>
          {provider.requirement_note !== undefined && (
            <span className="text-xs text-muted-foreground">{provider.requirement_note}</span>
          )}
        </span>
        {!comingSoon && (
          <ArrowRight aria-hidden="true" className="mt-1 size-4 text-muted-foreground" />
        )}
      </div>
      <p className="relative text-sm text-muted-foreground">{provider.tagline}</p>
      <div className="relative flex flex-wrap gap-1.5">
        {provider.capabilities.map((capability) => (
          <span
            key={capability}
            className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
          >
            {CAPABILITY_LABELS[capability]}
          </span>
        ))}
      </div>
    </>
  );

  if (comingSoon) {
    return (
      <div
        aria-disabled="true"
        className="flex w-full flex-col gap-3.5 rounded-lg border border-dashed border-border bg-background p-4 opacity-70"
      >
        {body}
      </div>
    );
  }

  return (
    <Link
      href={`/settings/integrations/connect?provider=${provider.kind}`}
      className={cn(
        "channel-surface flex w-full flex-col gap-3.5 rounded-lg border border-border bg-background p-4",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
        provider.brand_class,
      )}
    >
      {body}
    </Link>
  );
}

function governanceProblem(catalog: GovernanceState, orders: GovernanceState): string {
  const parts: string[] = [];
  if (catalog === "provider_declared_not_connected") parts.push("el catálogo");
  if (orders === "provider_declared_not_connected") parts.push("los pedidos");
  return `La plataforma declaró que ${parts.join(" y ")} los gobierna un proveedor externo, pero su conexión no está operativa.`;
}

function IntegrationsGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 2 }).map((_, index) => (
        <Skeleton key={index} className="h-40 rounded-lg" />
      ))}
    </div>
  );
}
