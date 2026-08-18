"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import type { IntegrationDTO } from "@/modules/integrations/domain/integration";
import { integrationProvider } from "@/modules/integrations/domain/integration-providers";
import { getIntegrationById } from "@/modules/integrations/infrastructure/services/integrations-service.adapter";
import { IntegrationProviderIcon } from "../IntegrationProviderIcon";
import { IntegrationStatusBadge } from "../IntegrationStatusBadge";
import { CollectionsTab } from "./CollectionsTab";
import { EstadoTab } from "./EstadoTab";
import { LocationsTab } from "./LocationsTab";
import { OrdersTab } from "./OrdersTab";
import { RunsTab } from "./RunsTab";

/**
 * `/settings/integrations/[id]` — la integración conectada, con pestañas
 * (contrato del plan F17 PR7): Estado · Ubicaciones · Categorías · Pedidos ·
 * Historial. Cada pestaña carga lo suyo al montarse: ubicaciones y colecciones
 * llaman al proveedor REAL y no deben pagarse al abrir el detalle.
 */
export function IntegrationDetailView({ integrationId }: { integrationId: string }) {
  const [integration, setIntegration] = useState<IntegrationDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setIntegration(await getIntegrationById(integrationId));
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "No se pudo cargar la integración"));
    }
  }, [integrationId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  if (error !== null) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => void refetch()}>
          <RefreshCw aria-hidden="true" className="size-4" />
          Reintentar
        </Button>
      </div>
    );
  }

  if (integration === null) {
    return <Skeleton className="h-72 rounded-lg" />;
  }

  const provider = integrationProvider(integration.provider);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="-ml-3 w-fit text-muted-foreground">
        <Link href="/settings/integrations">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Integraciones
        </Link>
      </Button>

      <header className="flex flex-wrap items-center gap-3">
        <IntegrationProviderIcon iconId={provider.icon_id} className={provider.brand_class} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-3xl font-semibold tracking-tight">
            {integration.account_label ?? provider.label}
          </h1>
          <p className="truncate text-muted-foreground">{integration.external_account}</p>
        </div>
        <IntegrationStatusBadge status={integration.status} />
      </header>

      <Tabs defaultValue="estado">
        <TabsList>
          <TabsTrigger value="estado">Estado</TabsTrigger>
          <TabsTrigger value="ubicaciones">Ubicaciones</TabsTrigger>
          <TabsTrigger value="categorias">Categorías</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="estado" className="pt-4">
          <EstadoTab integration={integration} onChanged={refetch} />
        </TabsContent>
        <TabsContent value="ubicaciones" className="pt-4">
          <LocationsTab integrationId={integration.id} onChanged={refetch} />
        </TabsContent>
        <TabsContent value="categorias" className="pt-4">
          <CollectionsTab integrationId={integration.id} onChanged={refetch} />
        </TabsContent>
        <TabsContent value="pedidos" className="pt-4">
          <OrdersTab />
        </TabsContent>
        <TabsContent value="historial" className="pt-4">
          <RunsTab integrationId={integration.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
