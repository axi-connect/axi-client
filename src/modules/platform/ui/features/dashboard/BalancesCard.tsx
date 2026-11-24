"use client";

/**
 * Tarjeta del Inicio: saldos de proveedores (alerta de saldos, 24-nov; mockup
 * aprobado). Lo que pide atención, con su frase, y cuántos más están bien.
 * Query propia: si falla, su error va dentro y no tumba el resto.
 */
import Link from "next/link";
import { cn } from "@/core/lib/utils";
import { formatRunway, formatUsd, formatWhen } from "../../../domain/balances";
import { useBalancesQuery } from "../../../infrastructure/api/hooks/use-balances";
import { PlatformStatePill } from "../../components/PlatformStatePill";
import { QueryBoundary } from "../../components/QueryBoundary";
import { ListSkeleton, ListTile } from "./parts";

const DOT: Record<string, string> = {
  critical: "bg-destructive",
  warning: "bg-warning",
  unknown: "bg-muted-foreground",
  ok: "bg-success",
};

export function BalancesCard() {
  const query = useBalancesQuery();

  return (
    <ListTile
      label="Saldos de proveedores"
      aside={
        query.data && query.data.counts.critical + query.data.counts.warning > 0 ? (
          <PlatformStatePill status={query.data.counts.critical > 0 ? "balance_critical" : "balance_low"} />
        ) : undefined
      }
      footNote="Se revisa cada 30 minutos"
      footHref="/platform/balances"
      footLabel="Ver saldos"
    >
      <QueryBoundary
        query={query}
        isEmpty={(data) => data.providers.length === 0}
        loading={<ListSkeleton rows={3} />}
        empty={<p className="py-6 text-center text-sm text-muted-foreground">Sin proveedores que vigilar.</p>}
      >
        {(data) => {
          const attention = data.providers.filter((row) => row.level === "critical" || row.level === "warning");
          const rest = data.providers.length - attention.length;
          return (
            <ul className="flex flex-col">
              {attention.slice(0, 4).map((row) => (
                <li key={row.id} className="border-t border-border-soft first:border-t-0">
                  <Link
                    href={`/platform/balances?proveedor=${encodeURIComponent(row.id)}`}
                    prefetch={false}
                    className="flex items-center justify-between gap-3 rounded-lg py-2.5 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", DOT[row.level])} />
                      <span className="truncate font-medium">{row.name}</span>
                    </span>
                    <span className="truncate text-right text-xs text-muted-foreground">
                      {row.incident
                        ? `${row.incident.kind === "no_funds" ? "Sin saldo" : "Llave inválida"} desde ${formatWhen(row.incident.since)}`
                        : row.balance_usd === null
                          ? "Sin dato"
                          : `${formatUsd(row.balance_usd)} · ${formatRunway(row.runway_days)}`}
                    </span>
                  </Link>
                </li>
              ))}
              {rest > 0 ? (
                <li className="flex items-center justify-between gap-3 border-t border-border-soft py-2.5 text-sm text-muted-foreground first:border-t-0">
                  <span className="flex items-center gap-2.5">
                    <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-success" />
                    {attention.length === 0
                      ? `${String(rest)} ${rest === 1 ? "proveedor" : "proveedores"}`
                      : `${String(rest)} ${rest === 1 ? "proveedor más" : "proveedores más"}`}
                  </span>
                  <span className="text-xs">{data.counts.unknown > 0 ? "Bien o sin dato" : "Bien"}</span>
                </li>
              ) : null}
            </ul>
          );
        }}
      </QueryBoundary>
    </ListTile>
  );
}
