"use client";

/**
 * Lista de ejecuciones (default de la sección Calidad): filtros server-side
 * (tenant/tipo/estado) + paginación; la query se refresca sola cada 3 s
 * mientras alguna ejecución de la página siga viva. CTA → wizard en
 * /platform/quality/runs/new.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { Play, Plus } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { TableSkeleton } from "@/shared/components/features/loading";
import BasicPagination from "@/shared/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { RunKind, RunStatus } from "../../../../domain/quality-runs";
import { useRunsQuery } from "../../../../infrastructure/api/hooks/use-quality-runs";
import { EmptyState } from "../../../components/EmptyState";
import { ProblemAlert } from "../../../components/ProblemAlert";
import { ALL_TENANTS, TenantSelect } from "../../../components/TenantSelect";
import { RunsTable } from "./RunsTable";

const PAGE_SIZE = 25;
const ALL = "all";

const STATUS_OPTIONS: { value: RunStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "running", label: "En curso" },
  { value: "completed", label: "Completada" },
  { value: "failed", label: "Fallida" },
  { value: "canceled", label: "Cancelada" },
  { value: "purging", label: "Purgando" },
  { value: "purged", label: "Purgada" },
];

export function RunsView() {
  const [tenantFilter, setTenantFilter] = useState<string>(ALL_TENANTS);
  const [kindFilter, setKindFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [page, setPage] = useState(1);

  const { data, isPending, isError, error, refetch, isPlaceholderData } = useRunsQuery({
    companyId: tenantFilter === ALL_TENANTS ? undefined : tenantFilter,
    kind: kindFilter === ALL ? undefined : (kindFilter as RunKind),
    status: statusFilter === ALL ? undefined : (statusFilter as RunStatus),
    page,
    pageSize: PAGE_SIZE,
  });

  const runs = useMemo(() => data?.data ?? [], [data]);
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = tenantFilter !== ALL_TENANTS || kindFilter !== ALL || statusFilter !== ALL;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <TenantSelect
            value={tenantFilter}
            onValueChange={(value) => {
              setTenantFilter(value);
              setPage(1);
            }}
            allowAll
            ariaLabel="Filtrar por tenant"
          />

          <Select
            value={kindFilter}
            onValueChange={(value) => {
              setKindFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-32" aria-label="Filtrar por tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todo tipo</SelectItem>
              <SelectItem value="qa">QA</SelectItem>
              <SelectItem value="stress">Estrés</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36" aria-label="Filtrar por estado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todo estado</SelectItem>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button asChild>
          <Link href="/platform/quality/runs/new" prefetch={false}>
            <Plus aria-hidden="true" />
            Nueva ejecución
          </Link>
        </Button>
      </div>

      {isPending ? (
        <TableSkeleton rows={6} />
      ) : isError ? (
        <ProblemAlert error={error} onRetry={() => void refetch()} />
      ) : total === 0 ? (
        <EmptyState
          icon={Play}
          title={hasFilters ? "Sin resultados" : "Aún no hay ejecuciones"}
          description={
            hasFilters
              ? "Ninguna ejecución coincide con los filtros."
              : "Lanza la primera ejecución de QA o estrés contra un tenant."
          }
          action={
            hasFilters ? (
              <Button
                variant="outline"
                onClick={() => {
                  setTenantFilter(ALL_TENANTS);
                  setKindFilter(ALL);
                  setStatusFilter(ALL);
                  setPage(1);
                }}
              >
                Limpiar filtros
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link href="/platform/quality/runs/new" prefetch={false}>
                  Lanzar la primera ejecución
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <div className={cn("space-y-3 transition-opacity", isPlaceholderData && "opacity-60")} aria-busy={isPlaceholderData}>
          <RunsTable runs={runs} />
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground tabular-nums">
              Página {page} de {totalPages} — {total} {total === 1 ? "ejecución" : "ejecuciones"}
            </p>
            {totalPages > 1 && (
              <BasicPagination totalPages={totalPages} page={page} onPageChange={setPage} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
