"use client";

/**
 * Columna izquierda del simulacro: mis sesiones (activas primero por orden
 * de creación) con estado, gasto y última actividad, filtro por tenant y el
 * botón «Nueva». La lista respira cada 5 s mientras haya una sesión activa.
 */
import Link from "next/link";
import { MessageSquareDashed, Plus } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatUsd, sessionStatusKey, sessionStatusLabel } from "../../../../../domain/quality-sessions";
import { useSessionsQuery } from "../../../../../infrastructure/api/hooks/use-quality-sessions";
import { ProblemAlert } from "../../../../components/ProblemAlert";
import { QualityStatus } from "../../shared/premium";
import { ALL_TENANTS, TenantSelect } from "../../../../components/TenantSelect";

type SessionsRailProps = {
  currentId: string | null;
  tenantFilter: string;
  onTenantFilterChange: (value: string) => void;
};

export function SessionsRail({ currentId, tenantFilter, onTenantFilterChange }: SessionsRailProps) {
  const sessionsQuery = useSessionsQuery({
    companyId: tenantFilter === ALL_TENANTS ? undefined : tenantFilter,
    mine: true,
    page: 1,
    pageSize: 20,
  });
  const sessions = sessionsQuery.data?.data ?? [];

  return (
    <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border border-border bg-card" aria-label="Mis sesiones">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <h2 className="text-base font-bold">Mis sesiones</h2>
        <Button asChild size="sm" variant="outline">
          <Link href="/platform/quality/simulator" prefetch={false}>
            <Plus aria-hidden="true" />
            Nueva
          </Link>
        </Button>
      </div>
      <div className="px-3 pb-2">
        <TenantSelect
          value={tenantFilter}
          onValueChange={onTenantFilterChange}
          allowAll
          className="w-full"
          ariaLabel="Filtrar sesiones por tenant"
        />
      </div>

      <ol className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {sessionsQuery.isPending && (
          <li className="space-y-2 p-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </li>
        )}
        {sessionsQuery.isError && (
          <li className="p-3">
            <ProblemAlert error={sessionsQuery.error} onRetry={() => void sessionsQuery.refetch()} />
          </li>
        )}
        {!sessionsQuery.isPending && !sessionsQuery.isError && sessions.length === 0 && (
          <li className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <MessageSquareDashed aria-hidden="true" className="size-7 text-muted-foreground" />
            <p className="text-sm font-medium">Sin sesiones</p>
            <p className="text-xs text-muted-foreground">
              Elige un tenant y un agente para empezar a hablar con él.
            </p>
          </li>
        )}
        {sessions.map((session) => {
          const active = session.id === currentId;
          return (
            <li key={session.id}>
              <Link
                href={`/platform/quality/simulator/${session.id}`}
                prefetch={false}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex flex-col gap-1.5 rounded-2xl px-3 py-2.5 text-sm transition-colors hover:bg-secondary",
                  active && "bg-accent hover:bg-accent",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">
                    {session.company_name}
                    {session.agent ? ` · ${session.agent.name}` : ""}
                  </span>
                  <QualityStatus status={sessionStatusKey(session)} />
                </span>
                <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{session.status === "active" ? session.agent?.model ?? "" : sessionStatusLabel(session)}</span>
                  <span className="shrink-0 tabular-nums">
                    {formatUsd(session.spend.spent_usd ?? 0)} · <RelativeDate iso={session.last_activity_at} />
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
