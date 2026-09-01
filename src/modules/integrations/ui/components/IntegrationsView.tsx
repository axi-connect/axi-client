"use client";

import { useEffect } from "react";
import { ArrowRight, RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { GovernanceState } from "@/modules/integrations/domain/integration";
import {
  CAPABILITY_LABELS,
  visibleProviders,
  type IntegrationProviderDescriptor,
} from "@/modules/integrations/domain/integration-providers";
import { useIntegrationsStore } from "@/modules/integrations/infrastructure/stores/integrations.store";
import { IntegrationCard } from "./IntegrationCard";
import {
  ProviderCard,
  ProviderCardGrid,
  type ProviderBrand,
} from "@/shared/components/features/provider-card";

import { IntegrationProviderIcon } from "./IntegrationProviderIcon";

/**
 * `/settings/integrations` — hermana de `/settings/channels` (F17 PR7, galería
 * alineada al patrón de canales en F10).
 *
 * Dos secciones: lo CONECTADO (tarjetas con superficie de marca) y lo
 * DISPONIBLE (galería de proveedores, con los `coming_soon` visibles e
 * inertes pero con su superficie de marca: comunicar la hoja de ruta es
 * información comercial útil y la vitrina se ve como producto, no como hueco).
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

  const connectedProviders = new Set<string>(items.map((item) => item.provider));
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
            <ProviderCardGrid>
              {items.map((integration) => (
                <IntegrationCard key={integration.id} integration={integration} />
              ))}
            </ProviderCardGrid>
          )}

          {available.length > 0 && (
            <section className="space-y-3">
              {/* Sin conexiones, la galería ES la página: el encabezado invita
                  en vez de catalogar */}
              {items.length > 0 ? (
                <h2 className="text-sm font-medium text-muted-foreground">Disponibles</h2>
              ) : (
                <h2 className="text-sm font-medium text-muted-foreground">
                  Conecta tu primera integración
                </h2>
              )}
              <ProviderCardGrid>
                {available.map((provider) => (
                  <AvailableProviderCard key={provider.kind} provider={provider} />
                ))}
              </ProviderCardGrid>
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

  return (
    <ProviderCard
      // Inerte pero CON superficie de marca: la hoja de ruta se ve como
      // producto, no como un hueco punteado.
      {...(comingSoon
        ? { inert: true }
        : { href: `/settings/integrations/connect?provider=${provider.kind}` })}
      brand={provider.brand_class.replace("brand-", "") as ProviderBrand}
      icon={<IntegrationProviderIcon iconId={provider.icon_id} bare />}
      title={
        <span className="flex flex-wrap items-center gap-2">
          {provider.label}
          {provider.recommended === true && (
            <span className="bg-accent-violet/12 text-accent-violet rounded-full px-2 py-0.5 text-xs font-medium">
              Recomendado
            </span>
          )}
          {comingSoon && (
            <span className="bg-secondary text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
              Muy pronto
            </span>
          )}
        </span>
      }
      subtitle={provider.requirement_note}
      badge={
        comingSoon ? undefined : (
          <ArrowRight aria-hidden="true" className="text-muted-foreground mt-1 size-4 shrink-0" />
        )
      }
      body={provider.tagline}
      chips={provider.capabilities.map((capability) => CAPABILITY_LABELS[capability])}
    />
  );
}


function governanceProblem(catalog: GovernanceState, orders: GovernanceState): string {
  const parts: string[] = [];
  if (catalog === "provider_declared_not_connected") parts.push("el catálogo");
  if (orders === "provider_declared_not_connected") parts.push("los pedidos");
  return `La plataforma declaró que ${parts.join(" y ")} los gobierna un proveedor externo, pero su conexión no está operativa.`;
}

/** Esqueleto ESTRUCTURAL: la silueta de las tarjetas que van a aparecer
 * (placa + dos líneas + chips), tantas como proveedores visibles. */
function IntegrationsGridSkeleton() {
  return (
    <ProviderCardGrid>
      {visibleProviders().map((provider) => (
        <div
          key={provider.kind}
          className="flex w-full flex-col gap-3.5 rounded-lg border border-border bg-background p-4"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="size-10 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-44 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-4 w-full" />
          <div className="flex flex-wrap gap-1.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </ProviderCardGrid>
  );
}
