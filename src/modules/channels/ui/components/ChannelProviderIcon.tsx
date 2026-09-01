import { QrCode } from "lucide-react";
import { FaFacebookMessenger, FaInstagram, FaRobot, FaWhatsapp } from "react-icons/fa";

import { cn } from "@/core/lib/utils";
import type { ChannelIconId } from "@/modules/channels/domain/channel-providers";

/**
 * Resuelve el `icon_id` del registry contra un diccionario CERRADO, que es la
 * pieza que permite que `domain/` no importe React (regla 1 de architecture
 * §3.3, y el mismo patrón que `core/lib/icons.ts` usa para el sidebar).
 *
 * Los logos de terceros vienen de `react-icons`, que es lo que DESIGN-SYSTEM §7
 * autoriza para marcas que lucide no tiene. El color oficial va SOLO en el
 * glifo; la placa se tiñe con `--ch-glow`, que declara la clase `brand-*` del
 * contenedor (utilidades `.channel-logo-plate` y `.text-logo-*` en globals.css).
 */
const ICONS: Record<ChannelIconId, React.ComponentType<{ className?: string }>> = {
  whatsapp: FaWhatsapp,
  qr: QrCode,
  instagram: FaInstagram,
  messenger: FaFacebookMessenger,
  robot: FaRobot,
};

const GLYPH_COLOR: Record<ChannelIconId, string> = {
  whatsapp: "text-logo-whatsapp",
  qr: "text-logo-whatsapp",
  instagram: "text-logo-instagram",
  messenger: "text-logo-messenger",
  robot: "text-muted-foreground",
};

export function ChannelProviderIcon({
  iconId,
  size = "md",
  bare = false,
  className,
}: {
  iconId: ChannelIconId;
  size?: "sm" | "md";
  /**
   * Solo el glifo, sin la placa. Lo usa `ProviderCard`, que pone la placa él
   * mismo para que todas las tarjetas del panel la tengan idéntica.
   */
  bare?: boolean;
  className?: string;
}) {
  const Icon = ICONS[iconId];
  const glyph = cn(size === "sm" ? "size-[19px]" : "size-6", GLYPH_COLOR[iconId], className);
  if (bare) return <Icon className={glyph} />;
  return (
    <span
      className={cn(
        "channel-logo-plate grid shrink-0 place-items-center rounded-md",
        size === "sm" ? "size-8" : "size-10",
        className,
      )}
    >
      <Icon className={glyph} />
    </span>
  );
}
