"use client";

import Link from "next/link";

import { cn } from "@/core/lib/utils";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import type { IntegrationDTO } from "@/modules/integrations/domain/integration";
import {
  CAPABILITY_LABELS,
  integrationProvider,
  type IntegrationCapabilityId,
} from "@/modules/integrations/domain/integration-providers";
import { IntegrationProviderIcon } from "./IntegrationProviderIcon";
import { IntegrationStatusBadge } from "./IntegrationStatusBadge";

/**
 * Tarjeta de una integración CONECTADA. Misma superficie premium que las
 * tarjetas de canal (`channel-surface` + `brand-*` de F0): el resplandor lleva
 * el color del proveedor y cambia al destructivo cuando la conexión falla.
 */
export function IntegrationCard({ integration }: { integration: IntegrationDTO }) {
  const provider = integrationProvider(integration.provider);
  const faulted = integration.status === "error";

  return (
    <Link
      href={`/settings/integrations/${integration.id}`}
      className={cn(
        "channel-surface flex w-full flex-col gap-3.5 rounded-lg border border-border bg-background p-4",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
        faulted ? "brand-fault" : provider.brand_class,
      )}
    >
      <div className="relative flex items-start gap-3">
        <IntegrationProviderIcon iconId={provider.icon_id} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-semibold">
            {integration.account_label ?? provider.label}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {integration.external_account}
          </span>
        </span>
        <IntegrationStatusBadge status={integration.status} />
      </div>

      <dl className="relative flex flex-wrap gap-x-6 gap-y-1.5">
        <Metric
          label="Última sincronización"
          value={
            integration.last_synced_at !== null ? (
              <RelativeDate iso={integration.last_synced_at} />
            ) : (
              "Todavía no corre"
            )
          }
        />
        <Metric label="Ubicaciones que suman" value={String(integration.counts.locations_counting)} />
        <Metric label="Categorías elegidas" value={String(integration.counts.collections_selected)} />
      </dl>

      <div className="relative flex flex-wrap gap-1.5">
        {integration.capabilities.map((capability) => (
          <span
            key={capability}
            className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
          >
            {CAPABILITY_LABELS[capability as IntegrationCapabilityId] ?? capability}
          </span>
        ))}
      </div>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-[13px] font-medium">{value}</dd>
    </div>
  );
}
