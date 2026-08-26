import { BillingTabs } from "@/modules/platform/ui/features/billing/BillingTabs";

/** Shell de la sección: las pestañas persisten entre cartera y tarifas. */
export default function PlatformBillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <BillingTabs />
      {children}
    </div>
  );
}
