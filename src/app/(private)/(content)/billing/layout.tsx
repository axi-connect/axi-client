import { BillingNav } from "@/modules/billing/ui/BillingNav";

/** Shell de la sección: la sub-navegación persiste entre Resumen y Facturas. */
export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <BillingNav />
      {children}
    </div>
  );
}
