import { Webhook } from "lucide-react";
import { FaHubspot, FaSalesforce, FaShopify } from "react-icons/fa";
import { SiMercadopago } from "react-icons/si";

import { cn } from "@/core/lib/utils";
import type { IntegrationIconId } from "@/modules/integrations/domain/integration-providers";

/**
 * Diccionario CERRADO de iconos del registry (mismo patrón que
 * `ChannelProviderIcon`): `domain/` declara identificadores y esta capa los
 * resuelve. Logos de terceros desde `react-icons` (DESIGN-SYSTEM §7); el color
 * oficial va SOLO en el glifo y la placa se tiñe con `--ch-glow` de la clase
 * `brand-*` del contenedor.
 */
const ICONS: Record<IntegrationIconId, React.ComponentType<{ className?: string }>> = {
  shopify: FaShopify,
  mercado_pago: SiMercadopago,
  webhook: Webhook,
  salesforce: FaSalesforce,
  hubspot: FaHubspot,
};

const GLYPH_COLOR: Record<IntegrationIconId, string> = {
  shopify: "text-logo-shopify",
  mercado_pago: "text-logo-mercadopago",
  webhook: "text-muted-foreground",
  salesforce: "text-logo-salesforce",
  hubspot: "text-logo-hubspot",
};

export function IntegrationProviderIcon({
  iconId,
  size = "md",
  className,
}: {
  iconId: IntegrationIconId;
  size?: "sm" | "md";
  className?: string;
}) {
  const Icon = ICONS[iconId];
  return (
    <span
      className={cn(
        "channel-logo-plate grid shrink-0 place-items-center rounded-md",
        size === "sm" ? "size-8" : "size-10",
        className,
      )}
    >
      <Icon className={cn(size === "sm" ? "size-[19px]" : "size-6", GLYPH_COLOR[iconId])} />
    </span>
  );
}
