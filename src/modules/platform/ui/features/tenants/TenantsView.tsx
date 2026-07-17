"use client";

/**
 * Lista de tenants: facets (estado/país) + búsqueda + sort en cliente
 * (`filterTenants`, el endpoint no pagina) sobre el `DataTable` compartido.
 * Estados obligatorios: TableSkeleton → datos / EmptyState / ProblemAlert.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { DataTable } from "@/shared/components/features/data-table";
import { TableSkeleton } from "@/shared/components/features/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { TenantStatus } from "../../../domain/tenant";
import { useTenantsQuery } from "../../../infrastructure/api/hooks/use-tenants";
import { EmptyState } from "../../components/EmptyState";
import { ProblemAlert } from "../../components/ProblemAlert";
import { tenantColumns } from "./tenants-table.config";
import {
  countriesIn,
  DEFAULT_TENANTS_FILTER,
  filterTenants,
  type TenantsFilterState,
  type TenantsSearchField,
} from "./tenants-filter";

const STATUS_OPTIONS: { value: TenantStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "active", label: "Activos" },
  { value: "trial", label: "Trial" },
  { value: "suspended", label: "Suspendidos" },
];

export function TenantsView() {
  const { data, isPending, isError, error, refetch } = useTenantsQuery();
  const [filter, setFilterState] = useState<TenantsFilterState>(DEFAULT_TENANTS_FILTER);
  const [page, setPage] = useState(1);

  /** Todo cambio de filtro regresa a la página 1 (evita páginas vacías). */
  function setFilter(update: (f: TenantsFilterState) => TenantsFilterState) {
    setFilterState(update);
    setPage(1);
  }

  const tenants = useMemo(() => data?.data ?? [], [data]);
  const filtered = useMemo(() => filterTenants(tenants, filter), [tenants, filter]);
  const countries = useMemo(() => countriesIn(tenants), [tenants]);
  const hasFacets = filter.status !== "all" || filter.country !== "all" || filter.search.value !== "";

  if (isPending) return <TableSkeleton rows={8} />;
  if (isError) {
    return <ProblemAlert error={error} onRetry={() => void refetch()} className="mx-auto max-w-xl" />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Tenants</h1>
          <p className="text-sm text-muted-foreground">
            {data.meta.total === 1 ? "1 empresa en la plataforma" : `${data.meta.total} empresas en la plataforma`}
          </p>
        </div>
        <Button asChild>
          <Link href="/platform/tenants/new">
            <Plus aria-hidden="true" />
            Crear tenant
          </Link>
        </Button>
      </header>

      {data.meta.total === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aún no hay tenants"
          description="Crea la primera empresa de la plataforma con su propietario y plan."
          action={
            <Button asChild variant="outline">
              <Link href="/platform/tenants/new">Crear el primer tenant</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filter.status}
              onValueChange={(status) => setFilter((f) => ({ ...f, status: status as TenantsFilterState["status"] }))}
            >
              <SelectTrigger className="w-44" aria-label="Filtrar por estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filter.country}
              onValueChange={(country) => setFilter((f) => ({ ...f, country }))}
            >
              <SelectTrigger className="w-40" aria-label="Filtrar por país">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los países</SelectItem>
                {countries.map((code) => (
                  <SelectItem key={code} value={code}>{code}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFacets && (
              <Button variant="ghost" size="sm" onClick={() => setFilter(() => DEFAULT_TENANTS_FILTER)}>
                Limpiar filtros
              </Button>
            )}
          </div>

          <DataTable
            data={filtered}
            columns={tenantColumns}
            pagination={{ page, pageSize: 10 }}
            onPageChange={setPage}
            sorting={{ by: filter.sort.by, dir: filter.sort.dir }}
            search={{ field: filter.search.field, value: filter.search.value }}
            preferredSearchFields={["name", "nit"]}
            onSortChange={(by, dir) => setFilter((f) => ({ ...f, sort: { by, dir } }))}
            onSearchChange={({ field, value }) =>
              setFilter((f) => ({ ...f, search: { field: field as TenantsSearchField, value } }))
            }
          />
        </div>
      )}
    </div>
  );
}
