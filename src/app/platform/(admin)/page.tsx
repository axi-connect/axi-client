import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/modules/platform/ui/components/EmptyState";

/** /platform — Dashboard (KPIs y triage llegan en FE6). */
export default function PlatformDashboardPage() {
  return (
    <EmptyState
      icon={LayoutDashboard}
      title="Dashboard de plataforma"
      description="Los indicadores de tenants, salud de agentes y alertas se construyen en fases posteriores. Empieza administrando tus tenants."
      action={
        <Button asChild variant="outline">
          <Link href="/platform/tenants">Ir a Tenants</Link>
        </Button>
      }
    />
  );
}
