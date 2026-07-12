"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/shared/auth/auth.hooks";
import { Avatar } from "@/shared/components/ui/avatar";
import { BrandMark } from "@/shared/components/ui/brand-mark";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatMoney } from "@/core/lib/format";
import { getMyCompany } from "@/modules/companies/infrastructure/services/company-service.adapter";
import type { CompanyDTO } from "@/modules/companies/domain/company";
import { PeriodSelector } from "@/modules/dashboard/ui/components/PeriodSelector";
import type { DashboardPeriod } from "@/modules/dashboard/domain/dashboard";
import { useDashboardStore } from "@/modules/dashboard/infrastructure/stores/dashboard.store";

/** Saludo por hora local (cercano, tuteo — DESIGN §7). */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

/**
 * Banner hero del dashboard: identidad de la empresa (logo + nombre grande)
 * como protagonista, con el isotipo Axi como sello discreto y el selector de
 * período. Fondo con el gradiente tricolor de marca a baja opacidad — único
 * momento hero permitido en el panel (DESIGN §3.2). La línea de estado se
 * deriva de métricas ya cargadas en el store (atención + ventas).
 */
export function DashboardBanner({
  period,
  onPeriodChange,
}: {
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
}) {
  const { user, status } = useSession();
  const [company, setCompany] = useState<CompanyDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const attention = useDashboardStore((state) => state.attention);
  const sales = useDashboardStore((state) => state.sales);

  useEffect(() => {
    if (status !== "authenticated") return;
    let ignore = false;
    getMyCompany()
      .then((data) => {
        if (!ignore) setCompany(data);
      })
      .catch(() => {
        /* Fallback a marca Axi; el banner no se rompe. */
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [status]);

  const statusBits: string[] = [];
  if (attention.data && attention.data.queued > 0) {
    statusBits.push(`${attention.data.queued} esperando`);
  }
  if (sales.data) {
    statusBits.push(
      `${formatMoney(sales.data.kpis.sales_cents, sales.data.kpis.currency)} en ventas`,
    );
  }
  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-background">
      {/* Gradiente tricolor de marca a baja opacidad (momento hero) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-brand-gradient-tri opacity-[0.12]" />
      <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 size-48 rounded-full bg-brand-gradient-tri opacity-20 blur-3xl" />

      <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {loading ? (
            <Skeleton className="size-14 shrink-0 rounded-2xl" />
          ) : company?.isotype_url ? (
            <Avatar
              src={company.isotype_url}
              alt={`Logo de ${company.name}`}
              fallback={company.name}
              shape="square"
              size={56}
              className="rounded-2xl"
            />
          ) : (
            <BrandMark className="size-14 shrink-0" aria-label="Axi Connect" />
          )}
          <div className="min-w-0">
            {loading ? (
              <Skeleton className="h-7 w-48" />
            ) : (
              <h1 className="truncate font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                {company?.name ?? "Axi Connect"}
              </h1>
            )}
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {greeting()}
              {firstName && `, ${firstName}`}
              {statusBits.length > 0 && ` · ${statusBits.join(" · ")}`}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BrandMark className="size-4" aria-hidden />
            Axi Connect
          </span>
          <PeriodSelector value={period} onChange={onPeriodChange} />
        </div>
      </div>
    </section>
  );
}
