import { TableSkeleton } from "@/shared/components/features/loading";

/** Silueta de la lista de tenants (forma conocida → skeleton estructural). */
export default function TenantsLoading() {
  return <TableSkeleton rows={8} />;
}
