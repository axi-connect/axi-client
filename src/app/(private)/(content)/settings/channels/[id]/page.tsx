import { ChannelDetailView } from "@/modules/channels/ui/components/ChannelDetailView";

export default async function ChannelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChannelDetailView channelId={id} />;
}
