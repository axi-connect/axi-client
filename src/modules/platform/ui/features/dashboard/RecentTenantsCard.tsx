"use client";

/**
 * Card del dashboard: últimos 5 tenants por fecha de alta (deriva de la
 * caché de la lista — misma query que /platform/tenants).
 */
import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useTenantsQuery } from "../../../infrastructure/api/hooks/use-tenants";
import { ProblemAlert } from "../../components/ProblemAlert";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import { StatusBadge } from "../../components/StatusBadge";

export function RecentTenantsCard() {
  const { data, isPending, isError, error, refetch } = useTenantsQuery();

  const recent = useMemo(
    () =>
      [...(data?.data ?? [])]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 5),
    [data],
  );

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Tenants recientes</h2>
        <Button asChild variant="ghost" size="sm">
          <Link href="/platform/tenants">
            Ver todos
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </header>

      {isPending ? (
        <Skeleton className="h-36 rounded-xl" />
      ) : isError ? (
        <ProblemAlert error={error} onRetry={() => void refetch()} />
      ) : recent.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Aún no hay tenants.</p>
      ) : (
        <ul className="space-y-2">
          {recent.map((tenant) => (
            <li key={tenant.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <Link
                href={`/platform/tenants/${tenant.id}`}
                prefetch={false}
                className="min-w-0 truncate font-medium transition-colors hover:text-brand"
              >
                {tenant.name}
              </Link>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">{tenant.nit}</span>
              <StatusBadge status={tenant.status} />
              <span className="text-xs text-muted-foreground">{tenant.country_code}</span>
              <RelativeDate iso={tenant.created_at} className="ml-auto text-xs text-muted-foreground" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
