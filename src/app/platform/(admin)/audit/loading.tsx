import { TableSkeleton } from "@/shared/components/features/loading";

/** Silueta del visor de auditoría (forma conocida → skeleton estructural). */
export default function AuditLoading() {
  return <TableSkeleton rows={8} />;
}
