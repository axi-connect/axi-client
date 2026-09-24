import { TableSkeleton } from "@/shared/components/features/loading";

export default function CrmSettingsJourneyLoading() {
  return <TableSkeleton rows={5} showHeader={false} />;
}
