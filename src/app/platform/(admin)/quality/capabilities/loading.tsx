import { TableSkeleton } from "@/shared/components/features/loading";

/** Silueta del tablero de capacidades. */
export default function CapabilitiesLoading() {
  return <TableSkeleton rows={8} />;
}
