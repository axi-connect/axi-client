import { CircleDollarSign } from "lucide-react";
import { EmptyState } from "@/modules/platform/ui/components/EmptyState";

/** /platform/pricing — tarifas de modelos IA por vigencia (FE5). */
export default function PlatformPricingPage() {
  return (
    <EmptyState
      icon={CircleDollarSign}
      title="Pricing IA"
      description="Las tarifas por proveedor y modelo, con su versionado por vigencia, se construyen en la fase FE5."
    />
  );
}
