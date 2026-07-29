import { TableSkeleton } from "@/shared/components/features/loading";

/** Skeleton estructural del listado (silueta: header + tabla). */
export default function CrmContactsLoading() {
  return (
    <div className="p-4 md:p-6">
      <TableSkeleton rows={8} />
    </div>
  );
}
