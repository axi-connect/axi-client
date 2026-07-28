import { TableSkeleton } from "@/shared/components/features/loading";

/** Silueta del catálogo de tarifas (forma conocida → skeleton estructural). */
export default function PricingLoading() {
  return <TableSkeleton rows={6} />;
}
