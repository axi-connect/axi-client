"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { PageHeader } from "@/shared/components/layout/page-header";
import type { CompanyStatus } from "@/modules/companies/domain/company";
import { useMyCompany } from "@/modules/companies/infrastructure/hooks/use-my-company";

const STATUS_LABELS: Record<CompanyStatus, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  active: { label: "Activa", variant: "default" },
  trial: { label: "Prueba", variant: "secondary" },
  suspended: { label: "Suspendida", variant: "destructive" },
};

/** Cabecera de Mi empresa: título fijo + estado del tenant desde el store. */
export function CompanySettingsHeader() {
  const { company, loading } = useMyCompany();
  const status = company ? STATUS_LABELS[company.status] : null;
  return (
    <PageHeader
      title="Mi empresa"
      description="Datos, sedes y medios de pago del negocio. La IA los usa como contexto para atender."
      badge={
        status ? (
          <Badge variant={status.variant}>{status.label}</Badge>
        ) : loading ? (
          <Skeleton className="h-5 w-16 rounded-full" />
        ) : null
      }
    />
  );
}
