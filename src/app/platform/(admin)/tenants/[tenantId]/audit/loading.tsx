import { TableSkeleton } from "@/shared/components/features/loading";

/** Silueta del tab Auditoría (lista conocida → skeleton estructural). */
export default function TenantAuditLoading() {
  return <TableSkeleton rows={6} showHeader={false} />;
}
