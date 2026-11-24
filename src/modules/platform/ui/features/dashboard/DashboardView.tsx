"use client";

/**
 * Inicio de la consola (rediseño F1, mockup aprobado). Honestidad primero: no
 * hay endpoints de agregados, TODAS las cifras se derivan en el cliente de las
 * listas (empresas, alertas disparadas, entrevistas). Cada tarjeta lleva su
 * query: un fallo aislado se pinta en su sitio sin tumbar el resto.
 *
 * Los mismos 6 datos de antes (empresas, activas, en prueba, suspendidas,
 * alertas activas, usuarios totales) en 4 fichas; la isla «Lo próximo»; y las
 * 3 listas (agentes en peor salud, alertas recientes, empresas recientes).
 */
import { useMemo } from "react";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { BentoFigure, BentoTile, StatePill } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { relativeTime } from "@/core/lib/relative-time";
import { latestIso, tenantStats, trialsEndingSoon } from "../../../domain/dashboard";
import { needsAttention } from "../../../domain/intake";
import { useAlertsQuery, useTriggeredAlertsCount } from "../../../infrastructure/api/hooks/use-analytics";
import { useIntakeSessionsQuery } from "../../../infrastructure/api/hooks/use-intake";
import { useTenantsQuery } from "../../../infrastructure/api/hooks/use-tenants";
import { EmptyState } from "../../components/EmptyState";
import { PlatformPageHeader } from "../../components/PlatformPageHeader";
import { ProblemAlert } from "../../components/ProblemAlert";
import { AgentsHealthSummaryCard } from "./AgentsHealthSummaryCard";
import { NextUpIsland } from "./NextUpIsland";
import { RecentAlertsCard } from "./RecentAlertsCard";
import { RecentTenantsCard } from "./RecentTenantsCard";

const TILE = "gap-2 rounded-[20px] p-4 sm:px-[18px]";

/** «La más reciente fue hace 3 h», «… fue ayer»; si `relativeTime` ya da una fecha, «… fue el 13 oct». */
export function latestAlertPhrase(relative: string): string {
  return /^\d/.test(relative) ? `La más reciente fue el ${relative}` : `La más reciente fue ${relative}`;
}

function Say({ children }: { children: React.ReactNode }) {
  return <p className="text-[12.5px] text-muted-foreground text-pretty">{children}</p>;
}

function BentoSkeleton() {
  return (
    <div role="status" aria-label="Cargando indicadores" className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 min-[900px]:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-[124px] rounded-[20px]" />
        ))}
      </div>
      <Skeleton className="h-56 rounded-3xl" />
    </div>
  );
}

export function DashboardView() {
  const tenantsQuery = useTenantsQuery();
  const alertsCount = useTriggeredAlertsCount();
  const alerts = useAlertsQuery("triggered");
  const intake = useIntakeSessionsQuery({});

  const tenants = useMemo(() => tenantsQuery.data?.data ?? [], [tenantsQuery.data]);
  const stats = useMemo(() => tenantStats(tenants, tenantsQuery.data?.meta.total), [tenants, tenantsQuery.data]);
  const trials = useMemo(() => trialsEndingSoon(tenants), [tenants]);
  const intakeAttention = useMemo(
    () => (intake.data ? intake.data.data.filter((row) => needsAttention(row)).length : undefined),
    [intake.data],
  );
  const lastAlertAt = useMemo(() => latestIso((alerts.data?.data ?? []).map((alert) => alert.created_at)), [alerts.data]);

  const isEmpty = tenantsQuery.isSuccess && stats.total === 0;
  const alertsValue = alertsCount.data;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PlatformPageHeader
        title="Plataforma"
        description="Todas las empresas de axi en un vistazo: qué pide atención hoy y cómo van."
        actions={
          <Button asChild className="rounded-full">
            <Link href="/platform/tenants/new">
              <Plus aria-hidden="true" />
              Nueva empresa
            </Link>
          </Button>
        }
      />

      {tenantsQuery.isError && tenantsQuery.data === undefined ? (
        <ProblemAlert error={tenantsQuery.error} onRetry={() => void tenantsQuery.refetch()} />
      ) : isEmpty ? (
        <EmptyState
          icon={Building2}
          title="Aún no hay empresas"
          description="Crea la primera empresa de la plataforma para empezar a ver actividad aquí."
          action={
            <Button asChild className="rounded-full">
              <Link href="/platform/tenants/new">Crear la primera empresa</Link>
            </Button>
          }
        />
      ) : (
        <>
          {tenantsQuery.isPending ? (
            <BentoSkeleton />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 min-[900px]:grid-cols-4">
                <BentoTile label="Empresas" className={TILE}>
                  <BentoFigure value={String(stats.total)} unit="en la plataforma" size="md" />
                  <Say>
                    {stats.active} {stats.active === 1 ? "activa" : "activas"} · {stats.trial} en prueba ·{" "}
                    {stats.suspended} {stats.suspended === 1 ? "suspendida" : "suspendidas"}
                  </Say>
                </BentoTile>
                <BentoTile label="En prueba" className={TILE}>
                  <BentoFigure value={String(stats.trial)} unit={stats.trial === 1 ? "empresa" : "empresas"} size="md" />
                  <Say>
                    {trials.length === 0
                      ? "Ninguna vence esta semana"
                      : trials.length === 1
                        ? "1 vence esta semana"
                        : `${String(trials.length)} vencen esta semana`}
                  </Say>
                </BentoTile>
                <BentoTile
                  label="Alertas activas"
                  className={TILE}
                  // En una ficha estrecha (celular) la píldora le quitaría el sitio a la etiqueta: baja al cuerpo.
                  aside={
                    alertsValue ? (
                      <span className="hidden sm:inline-flex">
                        <StatePill tone="warning">Revisar</StatePill>
                      </span>
                    ) : undefined
                  }
                >
                  {alertsValue ? (
                    <span className="sm:hidden">
                      <StatePill tone="warning">Revisar</StatePill>
                    </span>
                  ) : null}
                  <BentoFigure
                    value={alertsValue === undefined ? "—" : String(alertsValue)}
                    unit={alertsValue === undefined ? undefined : alertsValue === 1 ? "disparada" : "disparadas"}
                    size="md"
                  />
                  <Say>
                    {alertsCount.isError && alertsValue === undefined
                      ? "No pudimos contarlas"
                      : alertsValue && lastAlertAt
                        ? latestAlertPhrase(relativeTime(lastAlertAt))
                        : alertsValue === 0
                          ? "Todo en orden"
                          : "Contando…"}
                  </Say>
                </BentoTile>
                <BentoTile label="Usuarios totales" className={TILE}>
                  <BentoFigure value={String(stats.users)} unit={stats.users === 1 ? "persona" : "personas"} size="md" />
                  <Say>Suma de los equipos de todas las empresas</Say>
                </BentoTile>
              </div>

              <NextUpIsland
                alertsCount={alertsValue}
                alertsFailed={alertsCount.isError}
                alerts={alerts.data?.data ?? []}
                trials={trials}
                intakeAttention={intakeAttention}
                intakeFailed={intake.isError}
              />
            </>
          )}

          <div className="grid items-start gap-4 min-[1100px]:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)]">
            <div className="flex min-w-0 flex-col gap-4">
              <AgentsHealthSummaryCard />
              <RecentTenantsCard />
            </div>
            <div className="flex min-w-0 flex-col gap-4">
              <RecentAlertsCard />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
