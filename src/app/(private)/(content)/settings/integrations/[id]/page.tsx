import { IntegrationDetailView } from "@/modules/integrations/ui/components/detail/IntegrationDetailView";

export default async function IntegrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <IntegrationDetailView integrationId={id} />;
}
