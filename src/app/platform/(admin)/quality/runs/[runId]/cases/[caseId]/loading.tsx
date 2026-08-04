import { TableSkeleton } from "@/shared/components/features/loading";

/** Silueta del detalle de case (transcript + veredicto). */
export default function CaseDetailLoading() {
  return <TableSkeleton rows={6} />;
}
