/**
 * Columnas de la cartera. El `DataTable` exige filas de valores primitivos, así
 * que `PortfolioRow` aplana la factura; la acción resuelve la factura completa
 * vía `getInvoice`.
 */
import { formatMoney, formatShortDate } from "@/core/lib/format";
import type { ColumnDef } from "@/shared/components/features/data-table";
import { StatusBadge } from "@/shared/components/features/status-badge/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { INVOICE_STATUS_MAP } from "@/modules/billing/domain/invoice";
import type { PlatformInvoice } from "../../../domain/billing";

export type PortfolioRow = {
  id: string;
  company_id: string;
  company: string;
  number: string;
  status: string;
  due_at: string;
  total_cents: number;
  outstanding_cents: number;
  currency: string;
  days_overdue: number;
};

const DAY_MS = 86_400_000;

export function toPortfolioRow(invoice: PlatformInvoice, now = new Date()): PortfolioRow {
  const due = invoice.due_at === null ? null : new Date(invoice.due_at).getTime();
  return {
    id: invoice.id,
    company_id: invoice.company_id,
    // Es una pantalla de cobranza y nadie llama a un uuid. Si el backend no
    // resolvió el nombre, se muestra el id truncado antes que una fila anónima.
    company: invoice.company_name ?? `${invoice.company_id.slice(0, 8)}…`,
    number: invoice.number,
    status: invoice.status,
    due_at: invoice.due_at ?? "",
    total_cents: invoice.total_cents,
    outstanding_cents: invoice.outstanding_cents,
    currency: invoice.currency,
    days_overdue:
      due === null ? 0 : Math.max(0, Math.floor((now.getTime() - due) / DAY_MS)),
  };
}

export function buildPortfolioColumns(handlers: {
  onOpen: (invoice: PlatformInvoice) => void;
  getInvoice: (id: string) => PlatformInvoice | undefined;
}): ColumnDef<PortfolioRow>[] {
  return [
    {
      accessorKey: "company",
      header: "Empresa",
      sortable: true,
      minWidth: 220,
      cell: ({ row }) => <span className="font-medium">{row.original.company}</span>,
    },
    {
      accessorKey: "number",
      header: "Factura",
      sortable: true,
      minWidth: 130,
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.number}</span>,
    },
    {
      accessorKey: "due_at",
      header: "Vencimiento",
      sortable: true,
      minWidth: 160,
      cell: ({ row }) =>
        row.original.due_at === "" ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div className="flex flex-col">
            <span className="tabular-nums">{formatShortDate(row.original.due_at)}</span>
            {row.original.days_overdue > 0 ? (
              <span className="text-muted-foreground text-xs tabular-nums">
                hace {row.original.days_overdue}{" "}
                {row.original.days_overdue === 1 ? "día" : "días"}
              </span>
            ) : null}
          </div>
        ),
    },
    {
      accessorKey: "total_cents",
      header: "Total",
      sortable: true,
      minWidth: 130,
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatMoney(row.original.total_cents, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: "outstanding_cents",
      header: "Falta por pagar",
      sortable: true,
      minWidth: 150,
      cell: ({ row }) => (
        // Sale de `outstanding_cents` y NUNCA de total − pagado: la retención en
        // la fuente hace que un cliente que pagó bien gire menos que el total.
        <span
          className={
            row.original.outstanding_cents > 0
              ? "font-semibold tabular-nums"
              : "text-muted-foreground tabular-nums"
          }
        >
          {formatMoney(row.original.outstanding_cents, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Estado",
      minWidth: 140,
      cell: ({ row }) => (
        <StatusBadge status={row.original.status} map={INVOICE_STATUS_MAP} />
      ),
    },
    {
      id: "actions",
      header: "",
      alwaysVisible: true,
      minWidth: 90,
      cell: ({ row }) => {
        const invoice = handlers.getInvoice(row.original.id);
        if (!invoice) return null;
        return (
          <Button variant="ghost" size="sm" onClick={() => handlers.onOpen(invoice)}>
            Ver
          </Button>
        );
      },
    },
  ];
}
