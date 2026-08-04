import { TableSkeleton } from "@/shared/components/features/loading";

/** Silueta del detalle de ejecución (tiles + tabla de cases). */
export default function RunDetailLoading() {
  return <TableSkeleton rows={6} />;
}
