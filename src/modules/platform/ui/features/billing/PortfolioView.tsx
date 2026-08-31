"use client";

/**
 * Cartera (`/platform/billing`). Entra con `overdue=true` porque es la pantalla
 * de trabajo diario: quién debe, cuánto y desde cuándo. Un listado neutro de
 * todas las facturas serviría para auditar, no para cobrar.
 *
 * La lista pagina en server, así que los filtros viajan en la query key.
 */
import { useMemo, useState } from "react";
import { AlertTriangle, Clock, Receipt } from "lucide-react";
import { formatMoney } from "@/core/lib/format";
import { DataTable } from "@/shared/components/features/data-table";
import { TableSkeleton } from "@/shared/components/features/loading";
import { StatTile } from "@/shared/components/features/stat-tile/StatTile";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { PlatformInvoice } from "../../../domain/billing";
import {
  usePlatformInvoicesQuery,
  type InvoiceFilters,
} from "../../../infrastructure/api/hooks/use-billing";
import { EmptyState } from "../../components/EmptyState";
import { ProblemAlert } from "../../components/ProblemAlert";
import { InvoiceAdminSheet } from "./InvoiceAdminSheet";
import { buildPortfolioColumns, toPortfolioRow } from "./portfolio-table.config";

const PAGE_SIZE = 20;

type StatusFilter = NonNullable<InvoiceFilters["status"]> | "all";

export function PortfolioView() {
  const [overdue, setOverdue] = useState(true);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PlatformInvoice | null>(null);

  const filters = useMemo<InvoiceFilters>(
    () => ({
      ...(overdue ? { overdue: true } : {}),
      ...(status === "all" ? {} : { status }),
      page,
      page_size: PAGE_SIZE,
    }),
    [overdue, status, page],
  );

  const { data, isPending, isError, error, refetch } = usePlatformInvoicesQuery(filters);

  const invoices = useMemo(() => data?.data ?? [], [data]);

  /**
   * La búsqueda es EN CLIENTE y sobre la página cargada: el endpoint no acepta
   * texto libre. La UI lo dice en vez de aparentar una búsqueda global.
   */
  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matched =
      query === ""
        ? invoices
        : invoices.filter(
            (invoice) =>
              (invoice.company_name ?? "").toLowerCase().includes(query) ||
              invoice.number.toLowerCase().includes(query),
          );
    return matched.map((invoice) => toPortfolioRow(invoice));
  }, [invoices, search]);

  const columns = useMemo(
    () =>
      buildPortfolioColumns({
        onOpen: (invoice) => setSelected(invoice),
        getInvoice: (id) => invoices.find((invoice) => invoice.id === id),
      }),
    [invoices],
  );

  const totals = useMemo(() => {
    const outstanding = invoices.reduce((sum, invoice) => sum + invoice.outstanding_cents, 0);
    const companies = new Set(invoices.map((invoice) => invoice.company_id)).size;
    const suspendedRisk = invoices.filter((invoice) => invoice.outstanding_cents > 0).length;
    return { outstanding, companies, suspendedRisk };
  }, [invoices]);

  if (isPending) return <TableSkeleton rows={8} />;
  if (isError) {
    return (
      <ProblemAlert error={error} onRetry={() => void refetch()} className="mx-auto max-w-xl" />
    );
  }

  const total = data?.meta.total ?? 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Cartera</h1>
          <p className="text-muted-foreground text-sm">
            Quién debe, cuánto y desde cuándo.
          </p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          label={overdue ? "Vencido en esta página" : "Pendiente en esta página"}
          value={formatMoney(totals.outstanding)}
          icon={AlertTriangle}
          tone={totals.outstanding > 0 ? "warning" : "default"}
          hint={`${String(total)} ${total === 1 ? "factura" : "facturas"} en el filtro actual`}
        />
        <StatTile
          label="Empresas implicadas"
          value={totals.companies}
          icon={Receipt}
          hint="Distintas en esta página"
        />
        <StatTile
          label="Con saldo abierto"
          value={totals.suspendedRisk}
          icon={Clock}
          hint="Cada una avanza en su propio calendario de mora"
        />
      </div>

      <div className="border-border flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={overdue ? "overdue" : "all"}
            onValueChange={(value) => {
              setOverdue(value === "overdue");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[168px]" aria-label="Vencimiento">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overdue">Solo vencidas</SelectItem>
              <SelectItem value="all">Todas</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as StatusFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[188px]" aria-label="Estado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Cualquier estado</SelectItem>
              <SelectItem value="open">Pendiente</SelectItem>
              <SelectItem value="partially_paid">Pago parcial</SelectItem>
              <SelectItem value="paid">Pagada</SelectItem>
              <SelectItem value="void">Anulada</SelectItem>
              <SelectItem value="uncollectible">Incobrable</SelectItem>
            </SelectContent>
          </Select>

          <Input
            className="w-[210px]"
            placeholder="Buscar empresa o número"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <span className="text-muted-foreground text-xs">
          La búsqueda filtra esta página, no toda la cartera
        </span>
      </div>

      {total === 0 ? (
        <EmptyState
          glyph={overdue ? "uptodate" : "money"}
          title={overdue ? "Nadie debe nada" : "Todavía no hay facturas"}
          description={
            overdue
              ? "Ninguna factura está vencida ahora mismo. Cambia el filtro a «Todas» para ver el histórico."
              : "En cuanto se publique una tarifa y se emita el primer ciclo, aparecerán aquí."
          }
        />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          pagination={{ page, pageSize: PAGE_SIZE, total }}
          onPageChange={setPage}
          messages={{ empty: "Sin resultados en esta página" }}
        />
      )}

      <InvoiceAdminSheet
        invoice={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
