import { TableSkeleton } from "@/shared/components/features/loading";

export default function BillingInvoicesLoading() {
  return <TableSkeleton rows={5} />;
}
