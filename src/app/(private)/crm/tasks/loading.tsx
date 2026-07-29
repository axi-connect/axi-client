import { TableSkeleton } from "@/shared/components/features/loading";

/** Skeleton estructural de la bandeja. */
export default function CrmTasksLoading() {
  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <TableSkeleton rows={6} />
    </div>
  );
}
