import { TableSkeleton } from "@/shared/components/features/loading";

/** Silueta del aprovisionamiento (forma conocida → skeleton estructural). */
export default function PlatformCallsLoading() {
  return <TableSkeleton rows={6} />;
}
