"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/shared/auth/auth.hooks";
import { Avatar } from "@/shared/components/ui/avatar";
import { BrandMark } from "@/shared/components/ui/brand-mark";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatInteger } from "@/core/lib/commercial-units";
import { formatMillions } from "@/core/lib/format";
import { useMyCompany } from "@/modules/companies/public";
import { PeriodSelector } from "@/modules/dashboard/ui/components/PeriodSelector";
import { PERIOD_PHRASES, type DashboardPeriod } from "@/modules/dashboard/domain/dashboard";
import { useDashboardStore } from "@/modules/dashboard/infrastructure/stores/dashboard.store";

/** Hora local del negocio (0–23): el saludo y la fecha van en su zona, no en la del navegador. */
function hourIn(timeZone: string | undefined, now: Date): number {
  const hour = new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).format(now);
  return Number(hour);
}

/** Saludo por hora (cercano, tuteo — DESIGN §7). */
export function greeting(hour: number): string {
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** «miércoles 23 de septiembre», en la zona del negocio. */
export function longDate(now: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone })
    .format(now)
    .replace(",", "");
}

/**
 * La cabecera del Panel: la empresa (logo), el saludo en grande y UNA línea
 * de estado derivada de lo ya cargado (cola y ventas del período). «En vivo»
 * aparece solo mientras el socket está conectado: si no se refresca, no se
 * promete (§9.6). El selector de período a la derecha.
 */
export function DashboardHeader({
  period,
  onPeriodChange,
  live,
}: {
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
  live: boolean;
}) {
  const { user } = useSession();
  const { company, loading } = useMyCompany();
  const attention = useDashboardStore((state) => state.attention);
  const sales = useDashboardStore((state) => state.sales);

  // La hora solo en el cliente: el servidor no sabe la zona del negocio (la
  // empresa carga en el navegador) y un saludo pintado con su reloj se quedaba
  // al hidratar («Buenas noches» a las 10 de la mañana). Hasta montar, silueta.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const timeZone = company?.timezone || undefined;
  const firstName = user?.name?.split(" ")[0] ?? "";

  const status: string[] = [];
  if (attention.data && attention.data.queued > 0) {
    status.push(`${formatInteger(attention.data.queued)} ${attention.data.queued === 1 ? "espera" : "esperan"} en cola`);
  }
  if (sales.data && sales.data.kpis.sales_cents > 0) {
    status.push(`${formatMillions(sales.data.kpis.sales_cents, sales.data.kpis.currency)} vendidos ${PERIOD_PHRASES[sales.data.kpis.period]}`);
  }

  return (
    <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="flex min-w-0 items-center gap-4 sm:gap-5">
        {loading ? (
          <Skeleton className="size-12 shrink-0 rounded-2xl sm:size-15 sm:rounded-[1.2rem]" />
        ) : company?.isotype_url ? (
          <Avatar
            src={company.isotype_url}
            alt={`Logo de ${company.name}`}
            fallback={company.name}
            shape="square"
            size={60}
            className="size-12 shrink-0 rounded-2xl shadow-md sm:size-15 sm:rounded-[1.2rem]"
          />
        ) : (
          <BrandMark className="size-12 shrink-0 sm:size-15" aria-label="Axi Connect" />
        )}
        <div className="flex min-w-0 flex-col gap-1.5">
          {now === null || loading ? (
            <>
              <Skeleton className="h-3 w-56 rounded-md" />
              <Skeleton className="h-9 w-72 rounded-xl sm:h-11" />
            </>
          ) : (
            <>
              <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] text-pretty uppercase">
                {company?.name ?? "Axi Connect"} · <span className="whitespace-nowrap">{longDate(now, timeZone)}</span>
              </p>
              <h1 className="font-heading text-[1.9rem] leading-[1.05] font-bold tracking-tight text-balance sm:text-[2.6rem]">
                {greeting(hourIn(timeZone, now))}
                {firstName ? `, ${firstName}` : ""}
              </h1>
            </>
          )}
          {status.length > 0 ? <p className="text-muted-foreground text-sm text-pretty">{status.join(" · ")}</p> : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4">
        {live ? (
          <span className="text-muted-foreground inline-flex items-center gap-2 text-sm whitespace-nowrap">
            <span aria-hidden="true" className="bg-success size-1.5 rounded-full ring-4 ring-success/15" />
            En vivo
          </span>
        ) : null}
        <PeriodSelector value={period} onChange={onPeriodChange} />
      </div>
    </header>
  );
}
