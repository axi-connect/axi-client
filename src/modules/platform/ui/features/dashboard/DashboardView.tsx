"use client";

/**
 * Dashboard de plataforma (spec §5.1). Honestidad primero: no hay endpoints
 * de agregados de negocio — TODOS los KPIs se derivan en cliente de los GETs
 * de lista (tenants + alertas triggered). Cada card lleva su propia query:
 * un fallo aislado muestra su ProblemAlert inline sin tumbar el resto.
 */
import { useMemo } from "react";
import Link from "next/link";
import { Bell, Building2, CircleCheck, CirclePause, Sparkles, Users } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useTenantsQuery } from "../../../infrastructure/api/hooks/use-tenants";
import { useTriggeredAlertsCount } from "../../../infrastructure/api/hooks/use-analytics";
import { EmptyState } from "../../components/EmptyState";
import { ProblemAlert } from "../../components/ProblemAlert";
import { StatTile } from "./StatTile";
import { AgentsHealthSummaryCard } from "./AgentsHealthSummaryCard";
import { RecentAlertsCard } from "./RecentAlertsCard";
import { RecentTenantsCard } from "./RecentTenantsCard";

export function DashboardView() {
  const tenantsQuery = useTenantsQuery();
  const alertsCount = useTriggeredAlertsCount();

  const stats = useMemo(() => {
    const tenants = tenantsQuery.data?.data ?? [];
    return {
      total: tenantsQuery.data?.meta.total ?? tenants.length,
      active: tenants.filter((t) => t.status === "active").length,
      trial: tenants.filter((t) => t.status === "trial").length,
      suspended: tenants.filter((t) => t.status === "suspended").length,
      users: tenants.reduce((sum, t) => sum + t.users_count, 0),
    };
  }, [tenantsQuery.data]);

  const isEmpty = tenantsQuery.isSuccess && stats.total === 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Plataforma axi</h1>
        <p className="text-sm text-muted-foreground">Visión general de todos los tenants</p>
      </header>

      {tenantsQuery.isError ? (
        <ProblemAlert error={tenantsQuery.error} onRetry={() => void tenantsQuery.refetch()} />
      ) : isEmpty ? (
        <EmptyState
          icon={Building2}
          title="Aún no hay tenants"
          description="Crea la primera empresa de la plataforma para empezar a ver actividad aquí."
          action={
            <Button asChild>
              <Link href="/platform/tenants/new">Crear el primer tenant</Link>
            </Button>
          }
        />
      ) : (
        <>
          {tenantsQuery.isPending ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6" role="status" aria-label="Cargando indicadores">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-[86px] rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <StatTile label="Tenants" value={stats.total} icon={Building2} />
              <StatTile label="Activos" value={stats.active} icon={CircleCheck} />
              <StatTile label="Trial" value={stats.trial} icon={Sparkles} />
              <StatTile label="Suspendidos" value={stats.suspended} icon={CirclePause} />
              <StatTile
                label="Alertas activas"
                value={alertsCount.data ?? null}
                icon={Bell}
                tone={(alertsCount.data ?? 0) > 0 ? "warning" : "default"}
              />
              <StatTile label="Usuarios totales" value={stats.users} icon={Users} />
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <AgentsHealthSummaryCard />
            <RecentAlertsCard />
          </div>

          <RecentTenantsCard />
        </>
      )}
    </div>
  );
}
