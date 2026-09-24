import { TableSkeleton } from "@/shared/components/features/loading";

/** Silueta de la lista de datasets (forma conocida → skeleton estructural). */
export default function DatasetsLoading() {
  return <TableSkeleton rows={6} />;
}
