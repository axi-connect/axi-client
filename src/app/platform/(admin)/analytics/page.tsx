import { Activity } from "lucide-react";
import { EmptyState } from "@/modules/platform/ui/components/EmptyState";

/** /platform/analytics — triage de agentes y alertas cross-tenant (FE6). */
export default function PlatformAnalyticsPage() {
  return (
    <EmptyState
      icon={Activity}
      title="Analytics"
      description="El triage de salud de agentes y las alertas cross-tenant se construyen en la fase FE6."
    />
  );
}
