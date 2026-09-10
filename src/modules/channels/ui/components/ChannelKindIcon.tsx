import { channelProvider } from "@/modules/channels/domain/channel-providers";
import type { ChannelKind } from "@/modules/channels/domain/channel";
import { ChannelProviderIcon } from "./ChannelProviderIcon";

/**
 * Logo del proveedor a partir del `kind` del canal (glifo suelto, con su color
 * oficial). Es LA implementación: antes el sidebar del workspace tenía su
 * propio `KIND_ICONS` duplicado. Se exporta por `channels/public.ts` para el
 * inbox (badge del avatar) y el workspace (lista de canales).
 *
 * `aria-hidden` por defecto: casi siempre acompaña a un texto o va dentro de
 * un `role="img"` que ya nombra al canal.
 */
export function ChannelKindIcon({
  kind,
  className,
  "aria-hidden": ariaHidden = true,
  "aria-label": ariaLabel,
}: {
  kind: ChannelKind;
  className?: string;
  "aria-hidden"?: boolean;
  "aria-label"?: string;
}) {
  return (
    <span aria-hidden={ariaLabel === undefined ? ariaHidden : undefined} aria-label={ariaLabel} role={ariaLabel === undefined ? undefined : "img"} className="contents">
      <ChannelProviderIcon iconId={channelProvider(kind).icon_id} bare className={className} />
    </span>
  );
}
