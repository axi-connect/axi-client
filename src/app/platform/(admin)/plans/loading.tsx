import { TableSkeleton } from "@/shared/components/features/loading";

/** Silueta del catálogo de planes (forma conocida → skeleton estructural). */
export default function PlansLoading() {
  return <TableSkeleton rows={5} />;
}
