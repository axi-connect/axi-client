import { TableSkeleton } from "@/shared/components/features/loading";

/** Skeleton estructural del listado de pares. */
export default function ContactDuplicatesLoading() {
  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <TableSkeleton rows={4} />
    </div>
  );
}
