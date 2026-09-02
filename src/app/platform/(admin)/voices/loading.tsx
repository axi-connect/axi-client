import { TableSkeleton } from "@/shared/components/features/loading";

/** Silueta del catálogo de voces (forma conocida → skeleton estructural). */
export default function VoicesLoading() {
  return <TableSkeleton rows={6} />;
}
