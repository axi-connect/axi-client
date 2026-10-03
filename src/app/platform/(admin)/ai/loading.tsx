import { TableSkeleton } from "@/shared/components/features/loading";

/** Silueta del motor de decisiones (forma conocida → skeleton estructural). */
export default function DecisionEngineLoading() {
  return <TableSkeleton rows={7} />;
}
