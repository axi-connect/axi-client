"use client";

/**
 * Tab Resumen: honesto con el contrato — muestra SOLO lo que trae la lista
 * (no hay GET by id ni agregados). Cards de estado + identificación +
 * siguientes pasos hacia los tabs de configuración.
 */
import Link from "next/link";
import { ArrowRight, Check, Copy } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { relativeTime } from "@/core/lib/relative-time";
import { countryByCode } from "../../../../domain/catalogs";
import { useTenantQuery } from "../../../../infrastructure/api/hooks/use-tenants";
import { StatusBadge } from "../../../components/StatusBadge";
import { useCopy } from "../../../hooks/use-copy";

function SummaryCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 text-sm">{children}</div>
    </div>
  );
}

export function TenantSummary({ tenantId }: { tenantId: string }) {
  const { data: tenant, isPending } = useTenantQuery(tenantId);
  const { copied, copy } = useCopy();

  if (isPending) {
    return (
      <div className="grid gap-3 sm:grid-cols-3" role="status" aria-label="Cargando resumen">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  // El estado "no encontrado"/error lo cubre el header del layout.
  if (!tenant) return null;

  const base = `/platform/tenants/${tenant.id}`;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Estado">
          <StatusBadge status={tenant.status} />
        </SummaryCard>
        <SummaryCard label="Usuarios">
          <p className="text-2xl font-semibold tabular-nums">{tenant.users_count}</p>
        </SummaryCard>
        <SummaryCard label="Antigüedad">
          <p className="text-2xl font-semibold">{relativeTime(tenant.created_at)}</p>
        </SummaryCard>
      </div>

      <SummaryCard label="Identificación">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-3 sm:block">
            <dt className="text-muted-foreground">NIT</dt>
            <dd className="font-mono tabular-nums">{tenant.nit}</dd>
          </div>
          <div className="flex justify-between gap-3 sm:block">
            <dt className="text-muted-foreground">País</dt>
            <dd>{countryByCode(tenant.country_code)?.name ?? tenant.country_code}</dd>
          </div>
          <div className="flex justify-between gap-3 sm:block">
            <dt className="text-muted-foreground">Ciudad</dt>
            <dd>{tenant.city ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3 sm:block">
            <dt className="text-muted-foreground">ID</dt>
            <dd>
              <button
                type="button"
                onClick={() => void copy(tenant.id)}
                aria-label={`Copiar id ${tenant.id}`}
                className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                {tenant.id.slice(0, 8)}…
                {copied ? <Check aria-hidden="true" className="size-3 text-success" /> : <Copy aria-hidden="true" className="size-3" />}
              </button>
            </dd>
          </div>
        </dl>
      </SummaryCard>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Siguientes pasos:</span>
        <Button asChild variant="outline" size="sm">
          <Link href={`${base}/plan`}>
            Asignar plan
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`${base}/database`}>
            Configurar base de datos
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
