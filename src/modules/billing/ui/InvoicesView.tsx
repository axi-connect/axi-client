"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { formatMoney, formatShortDate } from "@/core/lib/format";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_MAP,
  isOverdue,
  isPayable,
  type InvoiceDTO,
  type InvoiceStatus,
} from "@/modules/billing/domain/invoice";
import { listInvoices } from "@/modules/billing/infrastructure/services/billing-service.adapter";
import { BILLING_INVOICE_CHANGED } from "@/modules/billing/domain/events";
import { useBillingSocket } from "@/modules/billing/infrastructure/realtime/use-billing-socket";
import { useStartCheckout } from "@/modules/billing/infrastructure/hooks/use-start-checkout";
import { useSuppressToasts } from "@/modules/notifications/public";
import { usePaginatedList } from "@/shared/api/use-paginated-list";
import { useAuth } from "@/shared/auth/auth.hooks";
import { EmptyState } from "@/shared/components/features/empty-state";
import { TableSkeleton } from "@/shared/components/features/loading";
import { StatusBadge } from "@/shared/components/features/status-badge/StatusBadge";
import { PageHeader } from "@/shared/components/layout/page-header";
import BasicPagination from "@/shared/components/ui/pagination";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { RelativeDate } from "@/shared/components/ui/relative-date";

const PAGE_SIZE = 20;

type StatusFilter = InvoiceStatus | "all";

/** Los estados que el tenant puede llegar a ver. `draft` no sale del backend. */
const FILTERABLE: InvoiceStatus[] = [
  "open",
  "partially_paid",
  "paid",
  "void",
  "uncollectible",
];

/**
 * Facturas de la licencia (`/billing/invoices`), más reciente primero.
 *
 * El endpoint solo acepta `page` y `page_size`: **no hay filtro por estado ni
 * búsqueda en el servidor**, así que ambos son en cliente y sobre la página
 * cargada — y la vista lo dice, en vez de aparentar un filtro global.
 */
export function InvoicesView() {
  const { hasPermission } = useAuth();
  const canPay = hasPermission("billing:pay");
  const { start, starting } = useStartCheckout();

  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const { items, total, loading, error, page, setPage, refresh } =
    usePaginatedList<InvoiceDTO>({
      fetcher: listInvoices,
      pageSize: PAGE_SIZE,
    });

  useBillingSocket();

  // Mientras la vista está montada, los avisos de facturación no saltan como
  // toast: el usuario está mirando justo eso.
  useSuppressToasts("billing.");

  // Una factura emitida o un pago aplicado cambian esta lista. La señal la
  // despacha `use-billing-socket` (convención `familia:acción:estado`,
  // architecture §9): el store del resumen no sirve aquí porque la lista tiene
  // su propia paginación.
  useEffect(() => {
    const onChange = () => void refresh();
    window.addEventListener(BILLING_INVOICE_CHANGED, onChange);
    return () => window.removeEventListener(BILLING_INVOICE_CHANGED, onChange);
  }, [refresh]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((invoice) => {
      if (status !== "all" && invoice.status !== status) return false;
      if (query !== "" && !invoice.number.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [items, status, search]);

  const hasFilter = status !== "all" || search.trim() !== "";
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Facturas"
        description="Historial de tu licencia, de la más reciente a la más antigua."
      />

      {loading && items.length === 0 ? (
        <TableSkeleton rows={5} />
      ) : error ? (
        <div className="border-destructive/35 bg-destructive/5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4">
          <p className="text-sm">{errorMessage(error)}</p>
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            Reintentar
          </Button>
        </div>
      ) : total === 0 ? (
        <EmptyState
          glyph="money"
          title="Todavía no tienes facturas"
          description="Aparecerán aquí en cuanto se cierre tu primer ciclo de facturación."
        />
      ) : (
        <div className="border-border overflow-hidden rounded-2xl border">
          <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b p-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="invoice-status">
                Estado
              </label>
              <select
                id="invoice-status"
                className="border-input bg-background h-9 rounded-md border px-2.5 text-sm"
                value={status}
                onChange={(event) => setStatus(event.target.value as StatusFilter)}
              >
                <option value="all">Todos los estados</option>
                {FILTERABLE.map((value) => (
                  <option key={value} value={value}>
                    {INVOICE_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
                />
                <Input
                  className="h-9 w-[190px] pl-9"
                  placeholder="Buscar por número"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <span className="text-muted-foreground text-xs tabular-nums">
                {total} {total === 1 ? "factura" : "facturas"}
              </span>
            </div>
            <span className="text-muted-foreground text-xs">
              El filtro se aplica sobre esta página
            </span>
          </div>

          {rows.length === 0 ? (
            <p className="text-muted-foreground p-8 text-center text-sm">
              {hasFilter
                ? "Ninguna factura de esta página coincide. Prueba en otra página o quita el filtro."
                : "Sin facturas en esta página."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary">
                    <Th>Factura</Th>
                    <Th>Período</Th>
                    <Th>Vencimiento</Th>
                    <Th right>Total</Th>
                    <Th right>Falta por pagar</Th>
                    <Th>Estado</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((invoice) => (
                    <InvoiceRow
                      key={invoice.id}
                      invoice={invoice}
                      canPay={canPay}
                      start={(id) => void start(id)}
                      starting={starting}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 p-3">
            <p className="text-muted-foreground text-xs tabular-nums">
              Mostrando {rows.length} de {total}
            </p>
            {totalPages > 1 ? (
              <BasicPagination totalPages={totalPages} page={page} onPageChange={setPage} />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`text-muted-foreground border-border border-b px-3.5 py-2.5 text-[10.5px] font-semibold tracking-wider uppercase ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function InvoiceRow({
  invoice,
  canPay,
  start,
  starting,
}: {
  invoice: InvoiceDTO;
  canPay: boolean;
  start: (invoiceId: string) => void;
  starting: boolean;
}) {
  const overdue = isOverdue(invoice);
  const payable = isPayable(invoice);

  return (
    <tr className="border-border/60 hover:bg-accent/40 border-b last:border-b-0">
      <td className="px-3.5 py-3">
        <Link
          href={`/billing/invoices/${invoice.id}`}
          className="hover:text-brand font-mono text-xs font-medium underline-offset-2 hover:underline"
        >
          {invoice.number}
        </Link>
      </td>
      <td className="text-muted-foreground px-3.5 py-3 tabular-nums">
        {formatShortDate(invoice.period_start)} – {formatShortDate(invoice.period_end)}
      </td>
      <td className="px-3.5 py-3">
        {invoice.due_at === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div className="flex flex-col">
            <span className={overdue ? "text-warning tabular-nums" : "tabular-nums"}>
              {formatShortDate(invoice.due_at)}
            </span>
            <RelativeDate iso={invoice.due_at} className="text-xs" />
          </div>
        )}
      </td>
      <td className="px-3.5 py-3 text-right tabular-nums">
        {formatMoney(invoice.total_cents, invoice.currency)}
      </td>
      <td className="px-3.5 py-3 text-right">
        {/* Sale de `outstanding_cents` y NUNCA de total − pagado: la retención en
            la fuente hace que un cliente que pagó bien gire menos que el total. */}
        <span
          className={
            invoice.outstanding_cents > 0
              ? "font-semibold tabular-nums"
              : "text-muted-foreground tabular-nums"
          }
        >
          {formatMoney(invoice.outstanding_cents, invoice.currency)}
        </span>
      </td>
      <td className="px-3.5 py-3">
        <StatusBadge status={invoice.status} map={INVOICE_STATUS_MAP} />
      </td>
      <td className="px-3.5 py-3 text-right">
        {payable && canPay ? (
          <Button
            size="sm"
            className="rounded-full"
            disabled={starting}
            onClick={() => void start(invoice.id)}
          >
            Pagar
          </Button>
        ) : invoice.withholding_cents > 0 ? (
          // Explica por qué una factura con «falta $ 0» tiene el pagado por
          // debajo del total, en vez de dejar la fila muda.
          <span className="text-muted-foreground text-xs">con retención</span>
        ) : null}
      </td>
    </tr>
  );
}
