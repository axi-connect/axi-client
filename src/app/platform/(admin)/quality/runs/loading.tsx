import { TableSkeleton } from "@/shared/components/features/loading";

/** Silueta de la lista de ejecuciones (forma conocida → skeleton estructural). */
export default function RunsLoading() {
  return <TableSkeleton rows={6} />;
}
