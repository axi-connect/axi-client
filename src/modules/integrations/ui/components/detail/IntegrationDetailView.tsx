"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { detailTabsFor, type IntegrationDetailTabId } from "@/modules/integrations/domain/detail-tabs";
import type { IntegrationDTO } from "@/modules/integrations/domain/integration";
import { integrationProvider } from "@/modules/integrations/domain/integration-providers";
import { getIntegrationById } from "@/modules/integrations/infrastructure/services/integrations-service.adapter";
import { IntegrationProviderIcon } from "../IntegrationProviderIcon";
import { IntegrationStatusBadge } from "../IntegrationStatusBadge";
import { CollectionsTab } from "./CollectionsTab";
import { ContactosTab } from "./ContactosTab";
import { EstadoTab } from "./EstadoTab";
import { LocationsTab } from "./LocationsTab";
import { OrdersTab } from "./OrdersTab";
import { RunsTab } from "./RunsTab";

/**
 * `/settings/integrations/[id]` — la integración conectada, con pestañas
 * DERIVADAS de sus capacidades (F9): `detailTabsFor` decide cuáles y este
 * registry cerrado decide cómo se pintan. Cada pestaña carga lo suyo al
 * montarse: ubicaciones y colecciones llaman al proveedor REAL y no deben
 * pagarse al abrir el detalle.
 */
type TabContext = {
  integration: IntegrationDTO;
  refetch: () => Promise<void>;
  /** «Sincronizar ahora» vive en Estado pero el avance se ve en Historial. */
  showHistory: () => void;
};

const TAB_REGISTRY: Record<
  IntegrationDetailTabId,
  { label: string; render: (ctx: TabContext) => React.ReactNode }
> = {
  estado: {
    label: "Estado",
    render: (ctx) => (
      <EstadoTab
        integration={ctx.integration}
        onChanged={ctx.refetch}
        onSyncStarted={ctx.showHistory}
      />
    ),
  },
  ubicaciones: {
    label: "Ubicaciones",
    render: (ctx) => <LocationsTab integrationId={ctx.integration.id} onChanged={ctx.refetch} />,
  },
  categorias: {
    label: "Categorías",
    render: (ctx) => <CollectionsTab integrationId={ctx.integration.id} onChanged={ctx.refetch} />,
  },
  pedidos: {
    label: "Pedidos",
    render: () => <OrdersTab />,
  },
  contactos: {
    label: "Contactos",
    render: () => <ContactosTab />,
  },
  historial: {
    label: "Historial",
    render: (ctx) => <RunsTab integrationId={ctx.integration.id} />,
  },
};

export function IntegrationDetailView({ integrationId }: { integrationId: string }) {
  const [integration, setIntegration] = useState<IntegrationDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<IntegrationDetailTabId>("estado");

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
  const tabs = detailTabsFor(provider, integration);
  const ctx: TabContext = { integration, refetch, showHistory: () => setTab("historial") };

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

      <Tabs value={tab} onValueChange={(value) => setTab(value as IntegrationDetailTabId)}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {TAB_REGISTRY[tab].label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab} value={tab} className="pt-4">
            {TAB_REGISTRY[tab].render(ctx)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
