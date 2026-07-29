import { TableSkeleton } from "@/shared/components/features/loading";

export default function CrmSettingsTagsLoading() {
  return <TableSkeleton rows={4} showHeader={false} />;
}
