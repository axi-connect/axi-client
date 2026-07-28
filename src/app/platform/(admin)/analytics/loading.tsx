import { TableSkeleton } from "@/shared/components/features/loading";

/** Silueta de analytics (forma conocida → skeleton estructural). */
export default function AnalyticsLoading() {
  return <TableSkeleton rows={6} />;
}
