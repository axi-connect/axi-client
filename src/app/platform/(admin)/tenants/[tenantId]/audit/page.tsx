import { ScrollText } from "lucide-react";
import { EmptyState } from "@/modules/platform/ui/components/EmptyState";

/** /platform/tenants/[id]/audit — auditoría con company_id fijado (FE5). */
export default function TenantAuditPage() {
  return (
    <EmptyState
      icon={ScrollText}
      title="Auditoría del tenant"
      description="El visor de eventos con el tenant fijado se construye en la fase FE5."
    />
  );
}
