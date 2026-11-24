"use client";

/**
 * Tarjeta del Inicio: las 5 empresas creadas más recientemente (de la caché
 * de la lista, la misma query que /platform/tenants). Nombre, NIT, ciudad y
 * país, estado y cuándo se creó.
 */
import Link from "next/link";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import { countryByCode } from "../../../domain/catalogs";
import { recentTenants } from "../../../domain/dashboard";
import { useTenantsQuery } from "../../../infrastructure/api/hooks/use-tenants";
import { PlatformStatePill } from "../../components/PlatformStatePill";
import { QueryBoundary } from "../../components/QueryBoundary";
import { ListSkeleton, ListTile, Monogram, monogramOf } from "./parts";

export function RecentTenantsCard() {
  const query = useTenantsQuery();

  return (
    <ListTile
      label="Empresas recientes"
      footNote="Las 5 últimas creadas"
      footHref="/platform/tenants"
      footLabel="Ver todas"
    >
      <QueryBoundary
        query={query}
        isEmpty={(data) => data.data.length === 0}
        loading={<ListSkeleton rows={3} />}
        empty={<p className="py-6 text-center text-sm text-muted-foreground">Aún no hay empresas.</p>}
      >
        {(data) => (
          <ul className="flex flex-col">
            {recentTenants(data.data).map((tenant) => {
              const country = countryByCode(tenant.country_code)?.name ?? tenant.country_code;
              const place = tenant.city ? `${tenant.city}, ${country}` : country;
              return (
                <li key={tenant.id} className="border-t border-border-soft first:border-t-0">
                  <Link
                    href={`/platform/tenants/${tenant.id}`}
                    prefetch={false}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-lg py-2.5 transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring sm:grid-cols-[minmax(0,1fr)_auto_auto]"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Monogram text={monogramOf(tenant.name)} />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium" title={tenant.name}>
                          {tenant.name}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          <span className="font-mono tabular-nums">{tenant.nit}</span> · {place}
                        </span>
                      </span>
                    </span>
                    <PlatformStatePill status={tenant.status} subject="tenant" />
                    <RelativeDate
                      iso={tenant.created_at}
                      className="col-start-2 text-right text-xs whitespace-nowrap text-muted-foreground sm:col-start-auto"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </QueryBoundary>
    </ListTile>
  );
}
