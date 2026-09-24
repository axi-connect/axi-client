import { TableSkeleton } from "@/shared/components/features/loading";

/** Silueta del simulacro mientras cargan las sesiones. */
export default function SimulatorLoading() {
  return <TableSkeleton rows={6} />;
}
