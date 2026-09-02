import { TableSkeleton } from "@/shared/components/features/loading";

export default function CallsHistoryLoading() {
  return (
    <div className="p-4 md:p-6">
      <TableSkeleton rows={8} />
    </div>
  );
}
