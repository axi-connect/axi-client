import { TableSkeleton } from "@/shared/components/features/loading";

export default function CrmSettingsSegmentsLoading() {
  return <TableSkeleton rows={4} showHeader={false} />;
}
