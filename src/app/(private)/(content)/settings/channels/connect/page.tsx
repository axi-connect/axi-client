import { ConnectChannelView } from "@/modules/channels/ui/components/connect/ConnectChannelView";

/**
 * `?canal=telegram` llega desde los accesos directos «Conecta Telegram en 1
 * minuto» (estudio del agente, estado vacío): salta la galería y abre el
 * paso del token.
 */
export default async function ConnectChannelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return <ConnectChannelView preselect={params.canal === "telegram" ? "telegram" : null} />;
}
