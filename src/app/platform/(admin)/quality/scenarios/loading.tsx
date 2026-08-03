import { TableSkeleton } from "@/shared/components/features/loading";

/** Silueta del catálogo de escenarios (forma conocida → skeleton estructural). */
export default function ScenariosLoading() {
  return <TableSkeleton rows={6} />;
}
