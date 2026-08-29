"use client";

import { RelativeDate } from "@/shared/components/ui/relative-date";
import type { IntegrationDTO } from "@/modules/integrations/domain/integration";
import {
  CAPABILITY_LABELS,
  integrationProvider,
  type IntegrationCapabilityId,
} from "@/modules/integrations/domain/integration-providers";
import {
  ProviderCard,
  type ProviderBrand,
} from "@/shared/components/features/provider-card";

import { IntegrationProviderIcon } from "./IntegrationProviderIcon";
import { IntegrationStatusBadge } from "./IntegrationStatusBadge";

/**
 * Tarjeta de una integración CONECTADA. Usa `ProviderCard`, el mismo componente
 * que canales y que las fuentes de captación: el resplandor lleva el color del
 * proveedor y cambia al destructivo cuando la conexión falla.
 */
export function IntegrationCard({ integration }: { integration: IntegrationDTO }) {
  const provider = integrationProvider(integration.provider);
  const faulted = integration.status === "error";

  return (
    <ProviderCard
      href={`/settings/integrations/${integration.id}`}
      brand={provider.brand_class.replace("brand-", "") as ProviderBrand}
      faulted={faulted}
      icon={<IntegrationProviderIcon iconId={provider.icon_id} bare />}
      title={integration.account_label ?? provider.label}
      subtitle={integration.external_account}
      badge={<IntegrationStatusBadge status={integration.status} />}
      metrics={[
        {
          label: "Última sincronización",
          value:
            integration.last_synced_at !== null ? (
              <RelativeDate iso={integration.last_synced_at} />
            ) : (
              "Todavía no corre"
            ),
        },
        {
          label: "Ubicaciones que suman",
          value: String(integration.counts.locations_counting),
        },
        {
          label: "Categorías elegidas",
          value: String(integration.counts.collections_selected),
        },
      ]}
      chips={integration.capabilities.map(
        (capability) =>
          CAPABILITY_LABELS[capability as IntegrationCapabilityId] ?? capability,
      )}
    />
  );
}
