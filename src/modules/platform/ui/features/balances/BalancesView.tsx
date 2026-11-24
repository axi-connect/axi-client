"use client";

/**
 * Dinero › Saldos (alerta de saldos de proveedores, 24-nov; mockup aprobado
 * por Cristian). Una sola tabla: lo que queda en cada proveedor que paga axi y
 * para cuántos días alcanza, lo peor primero. El detalle se abre en una hoja
 * al tocar la fila (o con `?proveedor=openai`, que es a donde lleva la franja).
 */
import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RefreshCw, Wallet } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { balanceStateKey, balanceText, formatRunway, formatUsd, formatWhen, lastSignal, type ProviderBalance } from "../../../domain/balances";
import { useBalancesQuery, useRefreshBalances } from "../../../infrastructure/api/hooks/use-balances";
import { EmptyState } from "../../components/EmptyState";
import { PlatformPageHeader } from "../../components/PlatformPageHeader";
import { PlatformStatePill } from "../../components/PlatformStatePill";
import { PlatformTable, type PlatformColumn } from "../../components/PlatformTable";
import { QueryBoundary } from "../../components/QueryBoundary";
import { BalanceSheet } from "./BalanceSheet";

const PROVIDER_PARAM = "proveedor";

function ProviderCell({ row }: { row: ProviderBalance }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-xl bg-muted text-xs font-semibold text-muted-foreground"
      >
        {row.name.slice(0, 1)}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">{row.name}</span>
        <span className="truncate text-xs text-muted-foreground">{row.use}</span>
      </span>
    </span>
  );
}

function BalanceCell({ row }: { row: ProviderBalance }) {
  const { value, note } = balanceText(row);
  return (
    <span className="flex flex-col">
      <span className="font-mono text-sm font-medium tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{note}</span>
    </span>
  );
}

const COLUMNS: readonly PlatformColumn<ProviderBalance>[] = [
  { id: "provider", header: "Proveedor", cell: (row) => <ProviderCell row={row} /> },
  {
    id: "state",
    header: "Estado",
    cell: (row) => <PlatformStatePill status={balanceStateKey(row)} />,
  },
  { id: "balance", header: "Saldo", cell: (row) => <BalanceCell row={row} /> },
  {
    id: "runway",
    header: "Alcanza para",
    cell: (row) => (
      <span className={cn("text-sm", row.level === "critical" || row.level === "warning" ? "font-medium" : "text-muted-foreground")}>
        {formatRunway(row.runway_days)}
      </span>
    ),
  },
  {
    id: "spend",
    header: "Gasto 7 días",
    align: "end",
    cell: (row) => (
      <span className="font-mono text-sm tabular-nums text-muted-foreground">
        {row.spend_7d_usd === null ? "—" : formatUsd(row.spend_7d_usd)}
      </span>
    ),
  },
  {
    id: "signal",
    header: "Última señal",
    cell: (row) => <span className="line-clamp-2 text-xs text-muted-foreground">{lastSignal(row)}</span>,
    cellClassName: "max-w-[16rem]",
  },
];

function MobileCard({ row }: { row: ProviderBalance }) {
  const { value } = balanceText(row);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <ProviderCell row={row} />
        <PlatformStatePill status={balanceStateKey(row)} />
      </div>
      <p className="text-xs text-muted-foreground">
        Saldo <span className="font-mono text-foreground">{value}</span> · alcanza para {formatRunway(row.runway_days)}
      </p>
      <p className="text-xs text-muted-foreground">{lastSignal(row)}</p>
    </div>
  );
}

function Summary({ counts }: { counts: Record<"critical" | "warning" | "ok" | "unknown", number> }) {
  const chips = [
    { key: "critical", n: counts.critical, text: "crítico", tone: "bg-destructive" },
    { key: "warning", n: counts.warning, text: "bajo", tone: "bg-warning" },
    { key: "ok", n: counts.ok, text: "bien", tone: "bg-success" },
    { key: "unknown", n: counts.unknown, text: "sin dato", tone: "bg-muted-foreground" },
  ].filter((chip) => chip.n > 0);
  return (
    <ul aria-label="Resumen" className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <li
          key={chip.key}
          className="inline-flex h-7 items-center gap-1.5 rounded-full bg-muted px-3 text-xs font-medium text-foreground"
        >
          <span aria-hidden="true" className={cn("size-1.5 rounded-full", chip.tone)} />
          {chip.n} {chip.text}
        </li>
      ))}
    </ul>
  );
}

export function BalancesView() {
  const query = useBalancesQuery();
  const refresh = useRefreshBalances();
  const { showAlert } = useAlert();
  const router = useRouter();
  const pathname = usePathname() ?? "/platform/balances";
  const searchParams = useSearchParams();
  const selectedId = searchParams?.get(PROVIDER_PARAM) ?? null;

  const select = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (id === null) params.delete(PROVIDER_PARAM);
      else params.set(PROVIDER_PARAM, id);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const selected = useMemo(
    () => query.data?.providers.find((row) => row.id === selectedId) ?? null,
    [query.data, selectedId],
  );

  async function checkNow() {
    try {
      await refresh.mutateAsync();
      showAlert({ tone: "success", title: "Saldos revisados", autoCloseMs: 4000 });
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudieron revisar los saldos", description: errorMessage(error) });
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PlatformPageHeader
        title="Saldos"
        description="Lo que queda en cada proveedor y para cuántos días alcanza. Se revisa cada 30 minutos; si uno empieza a fallar, te enteras al instante."
        actions={
          <>
            {query.data?.checked_at ? (
              <span className="text-xs text-muted-foreground">Revisado {formatWhen(query.data.checked_at)}</span>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={refresh.isPending}
              onClick={() => void checkNow()}
            >
              <RefreshCw aria-hidden="true" className={cn(refresh.isPending && "animate-spin")} />
              {refresh.isPending ? "Revisando…" : "Revisar ahora"}
            </Button>
          </>
        }
      />

      <QueryBoundary
        query={query}
        isEmpty={(data) => data.providers.length === 0}
        loading={
          <div role="status" aria-label="Cargando saldos" className="flex flex-col gap-3">
            <Skeleton className="h-7 w-48 rounded-full" />
            <Skeleton className="h-80 rounded-3xl" />
          </div>
        }
        empty={
          <EmptyState
            icon={Wallet}
            title="Aún no hay proveedores que vigilar"
            description="Cuando la plataforma use un proveedor de pago, aparece aquí con su saldo y su estado."
          />
        }
      >
        {(data) => (
          <div className="flex min-w-0 flex-col gap-4">
            <Summary counts={data.counts} />
            <PlatformTable
              label="Saldos de proveedores"
              rows={data.providers}
              columns={COLUMNS}
              rowKey={(row) => row.id}
              onRowClick={(row) => select(row.id)}
              rowLabel={(row) => `Ver el detalle de ${row.name}`}
              mobileCard={(row) => <MobileCard row={row} />}
              pageSize={20}
              unit="proveedores"
              empty={null}
            />
            <p className="max-w-[72ch] text-xs text-muted-foreground text-pretty">
              Los proveedores sin consulta de saldo se vigilan por sus respuestas: si uno responde «sin saldo» o
              «llave inválida», pasa a rojo al instante y te llega un correo.
            </p>
          </div>
        )}
      </QueryBoundary>

      {selected ? (
        <BalanceSheet
          key={selected.id}
          provider={selected}
          open
          onOpenChange={(open) => {
            if (!open) select(null);
          }}
        />
      ) : null}
    </div>
  );
}
