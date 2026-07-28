import { TableSkeleton } from "@/shared/components/features/loading";

/** Silueta del tab Usuarios (lista conocida → skeleton estructural). */
export default function TenantUsersLoading() {
  return <TableSkeleton rows={5} showHeader={false} />;
}
