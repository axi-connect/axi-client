import { TableSkeleton } from "@/shared/components/features/loading";

export default function CrmSettingsPipelinesLoading() {
  return <TableSkeleton rows={5} showHeader={false} />;
}
