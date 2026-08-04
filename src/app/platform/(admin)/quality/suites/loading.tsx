import { TableSkeleton } from "@/shared/components/features/loading";

/** Silueta del catálogo de suites (forma conocida → skeleton estructural). */
export default function SuitesLoading() {
  return <TableSkeleton rows={5} />;
}
