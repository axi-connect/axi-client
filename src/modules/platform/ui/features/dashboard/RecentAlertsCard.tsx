"use client";

/**
 * Card del dashboard: alertas disparadas recientes (misma query key que el
 * badge del sidebar y el tab Alertas — una sola request compartida).
 */
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useAlertsQuery } from "../../../infrastructure/api/hooks/use-analytics";
import { ProblemAlert } from "../../components/ProblemAlert";
import { RelativeDate } from "@/shared/components/ui/relative-date";

export function RecentAlertsCard() {
  const { data, isPending, isError, error, refetch } = useAlertsQuery("triggered");
  const recent = (data?.data ?? []).slice(0, 5);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Alertas recientes</h2>
        <span className="text-xs text-muted-foreground">disparadas</span>
      </header>

      {isPending ? (
        <Skeleton className="h-36 rounded-xl" />
      ) : isError ? (
        <ProblemAlert error={error} onRetry={() => void refetch()} />
      ) : recent.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Sin alertas activas. Todo en orden.</p>
      ) : (
        <ul className="flex-1 space-y-2">
          {recent.map((alert) => (
            <li key={alert.id} className="flex items-center justify-between gap-3 text-sm">
              <Link
                href={`/platform/tenants/${alert.company_id}`}
                prefetch={false}
                className="min-w-0 truncate transition-colors hover:text-brand"
              >
                <span className="font-mono text-xs">{alert.rule}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {alert.company_name ?? `${alert.company_id.slice(0, 8)}…`}
                </span>
              </Link>
              <RelativeDate iso={alert.created_at} className="shrink-0 text-xs text-muted-foreground" />
            </li>
          ))}
        </ul>
      )}

      <Button asChild variant="ghost" size="sm" className="self-end">
        <Link href="/platform/analytics">
          Ver alertas
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}
