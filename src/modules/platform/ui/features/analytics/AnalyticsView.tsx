"use client";

/**
 * Analytics cross-tenant: tabs Triage de agentes / Alertas (estado local —
 * son vistas de la misma página). Triage con selector de periodo (1/7/30/90
 * días) y panel lateral `alerts_by_company`; Alertas con sub-tabs de status
 * (map directo al query param). `degraded` → DegradedBanner en ambas.
 * Refresco 60 s + focus, pausado con el ReLoginModal.
 */
import { useState } from "react";
import { Activity, BellOff } from "lucide-react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  ALERT_STATUSES,
  ANALYTICS_PERIODS,
  DEFAULT_ANALYTICS_PERIOD,
  type AlertStatus,
} from "../../../domain/analytics";
import {
  useAgentsHealthQuery,
  useAlertsQuery,
} from "../../../infrastructure/api/hooks/use-analytics";
import { DegradedBanner } from "../../components/DegradedBanner";
import { EmptyState } from "../../components/EmptyState";
import { ProblemAlert } from "../../components/ProblemAlert";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import { AgentsHealthTable } from "./AgentsHealthTable";
import { AlertsTable } from "./AlertsTable";

function TriageTab() {
  const [days, setDays] = useState(DEFAULT_ANALYTICS_PERIOD);
  const { data, isPending, isError, error, refetch, dataUpdatedAt } = useAgentsHealthQuery(days);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Ordenado por severidad
          {dataUpdatedAt > 0 && (
            <>
              {" · actualizado "}
              <RelativeDate iso={new Date(dataUpdatedAt).toISOString()} />
            </>
          )}
        </p>
        <Select value={String(days)} onValueChange={(value) => setDays(Number(value))}>
          <SelectTrigger className="w-32" aria-label="Periodo del triage">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ANALYTICS_PERIODS.map((period) => (
              <SelectItem key={period} value={String(period)}>
                {period === 1 ? "1 día" : `${period} días`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {data?.degraded && <DegradedBanner />}

      {isPending ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : isError ? (
        <ProblemAlert error={error} onRetry={() => void refetch()} />
      ) : data.agents.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Sin actividad de agentes"
          description={`Ningún agente registró turnos en los últimos ${days === 1 ? "1 día" : `${days} días`}.`}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
          <AgentsHealthTable agents={data.agents} />
          <aside className="space-y-2 rounded-2xl border border-border bg-background p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Alertas por tenant
            </h3>
            {data.alerts_by_company.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin alertas en el periodo.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.alerts_by_company.map((entry) => (
                  <li key={entry.company_id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{entry.company_name ?? `${entry.company_id.slice(0, 8)}…`}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {entry.triggered > 0 ? (
                        <span className="font-medium text-warning">{entry.triggered} ⚠</span>
                      ) : (
                        entry.total
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function AlertsTab() {
  const [status, setStatus] = useState<AlertStatus>("triggered");
  const { data, isPending, isError, error, refetch } = useAlertsQuery(status);
  const statusLabel = ALERT_STATUSES.find((s) => s.value === status)?.label.toLowerCase() ?? status;

  return (
    <div className="space-y-4">
      {/* Es un FILTRO, no una pestaña: no tiene panel propio, así que va como
          radiogroup. Antes declaraba `role="tab"` sin `tabpanel`, que anuncia al
          lector de pantalla una pestaña cuyo contenido no existe. */}
      <SegmentedControl
        value={status}
        onValueChange={(value) => setStatus(value)}
        label="Estado de las alertas"
        items={ALERT_STATUSES.map((option) => ({
          value: option.value,
          label: option.label,
          count: option.value === status && data ? data.meta.total : null,
        }))}
      />

      {data?.meta.degraded && <DegradedBanner />}

      {isPending ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : isError ? (
        <ProblemAlert error={error} onRetry={() => void refetch()} />
      ) : data.data.length === 0 ? (
        <EmptyState icon={BellOff} title={`No hay alertas ${statusLabel}`} />
      ) : (
        <AlertsTable alerts={data.data} />
      )}
    </div>
  );
}

export function AnalyticsView() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Salud de agentes y alertas de todos los tenants · se actualiza cada 60 s
        </p>
      </header>

      <Tabs defaultValue="triage">
        <TabsList>
          <TabsTrigger value="triage">Triage de agentes</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>
        <TabsContent value="triage" className="mt-4">
          <TriageTab />
        </TabsContent>
        <TabsContent value="alerts" className="mt-4">
          <AlertsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
