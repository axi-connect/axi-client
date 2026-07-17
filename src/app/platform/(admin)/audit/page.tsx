import { ScrollText } from "lucide-react";
import { EmptyState } from "@/modules/platform/ui/components/EmptyState";

/** /platform/audit — visor global de auditoría (FE5). */
export default function PlatformAuditPage() {
  return (
    <EmptyState
      icon={ScrollText}
      title="Auditoría"
      description="El visor de eventos con filtros por tenant y acción se construye en la fase FE5."
    />
  );
}
