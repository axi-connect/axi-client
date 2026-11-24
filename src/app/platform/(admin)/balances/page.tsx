import { Suspense } from "react";
import { BalancesView } from "@/modules/platform/ui/features/balances/BalancesView";

/** /platform/balances — Dinero › Saldos: saldo y estado de cada proveedor que paga axi. */
export default function PlatformBalancesPage() {
  return (
    <Suspense>
      <BalancesView />
    </Suspense>
  );
}
