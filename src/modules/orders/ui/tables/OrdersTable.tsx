"use client";

import { useMemo, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { downloadCsv, toCsv } from "@/core/lib/csv";
import { relativeTime } from "@/core/lib/relative-time";
import { Avatar } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { DataTable } from "@/shared/components/features/data-table";
import type { ColumnDef } from "@/shared/components/features/data-table/types";
import { usePaginatedList } from "@/shared/api/use-paginated-list";
import {
  formatMoney,
  mapOrderToRow,
  orderNumberLabel,
  type OrderRow,
  type OrderStatus,
} from "@/modules/orders/domain/order";
import { ORDER_STATUS_LABELS } from "@/modules/orders/domain/order-state";
import { listOrders } from "@/modules/orders/infrastructure/services/orders-service.adapter";
import { useOrdersStore } from "@/modules/orders/infrastructure/stores/orders.store";
import { OrderOriginBadge } from "@/modules/orders/ui/components/OrderOriginBadge";
import { OrderStatusBadge } from "@/modules/orders/ui/components/OrderStatusBadge";

const STATUS_FILTER_OPTIONS: Array<{ value: OrderStatus | "all"; label: string }> = [
  { value: "all", label: "Todos los estados" },
  ...(Object.entries(ORDER_STATUS_LABELS) as Array<[OrderStatus, string]>).map(
    ([value, label]) => ({ value, label }),
  ),
];

/**
 * Vista tabla (mockup "Order Reports"): DataTable + usePaginatedList con
 * filtros server-side y export CSV del listado visible. No se re-pagina al
 * llegar eventos WS: un chip "N pedidos nuevos · Actualizar" (realtimeVersion
 * del store) deja al operador decidir cuándo refrescar.
 */
export function OrdersTable({ onOpenOrder }: { onOpenOrder: (orderId: string) => void }) {
  const realtimeVersion = useOrdersStore((s) => s.realtimeVersion);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [originFilter, setOriginFilter] = useState<"all" | "user" | "ai_agent">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [seenVersion, setSeenVersion] = useState(realtimeVersion);

  const extraParams = useMemo(
    () => ({
      status: statusFilter === "all" ? undefined : statusFilter,
      created_by_type: originFilter === "all" ? undefined : originFilter,
      created_from: fromDate !== "" ? new Date(fromDate).toISOString() : undefined,
      created_to: toDate !== "" ? new Date(`${toDate}T23:59:59`).toISOString() : undefined,
    }),
    [statusFilter, originFilter, fromDate, toDate],
  );

  const list = usePaginatedList<OrderRow, "search">({
    fetcher: async (params) => {
      const res = await listOrders(params);
      return { data: res.data.map(mapOrderToRow), meta: res.meta };
    },
    pageSize: 25,
    searchField: "search",
    extraParams,
  });

  const pendingEvents = realtimeVersion - seenVersion;

  const columns: ColumnDef<OrderRow>[] = useMemo(
    () => [
      {
        accessorKey: "order_number",
        header: "N° pedido",
        sortable: false,
        alwaysVisible: true,
        cell: ({ row }) => (
          <button
            type="button"
            className="font-mono text-xs font-semibold text-primary underline-offset-2 hover:underline focus-visible:ring-ring rounded"
            onClick={() => onOpenOrder(row.original.id)}
          >
            {orderNumberLabel(row.original.order_number)}
          </button>
        ),
      },
      {
        accessorKey: "contact_name",
        header: "Cliente",
        alwaysVisible: true,
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            <Avatar alt={row.original.contact_name} fallback={row.original.contact_name} size={26} />
            <span className="truncate font-medium">{row.original.contact_name}</span>
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Estado",
        alwaysVisible: true,
        cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "total_cents",
        header: "Total",
        cell: ({ row }) => (
          <span className="font-semibold tabular-nums">
            {formatMoney(row.original.total_cents, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: "created_by_type",
        header: "Origen",
        cell: ({ row }) => <OrderOriginBadge origin={row.original.created_by_type} />,
      },
      {
        accessorKey: "created_at",
        header: "Creado",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{relativeTime(row.original.created_at)}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        alwaysVisible: true,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => onOpenOrder(row.original.id)}
          >
            Ver detalle
          </Button>
        ),
      },
    ],
    [onOpenOrder],
  );

  function exportCsv() {
    const csv = toCsv(list.items, [
      { header: "N° pedido", value: (row) => row.order_number ?? "" },
      { header: "Cliente", value: (row) => row.contact_name },
      { header: "Estado", value: (row) => ORDER_STATUS_LABELS[row.status] },
      { header: "Total", value: (row) => row.total_cents / 100 },
      { header: "Moneda", value: (row) => row.currency },
      { header: "Origen", value: (row) => (row.created_by_type === "ai_agent" ? "IA" : "Operador") },
      { header: "Creado", value: (row) => row.created_at },
    ]);
    downloadCsv(`pedidos-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as OrderStatus | "all")}
        >
          <SelectTrigger className="w-44" aria-label="Filtrar por estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={originFilter}
          onValueChange={(value) => setOriginFilter(value as "all" | "user" | "ai_agent")}
        >
          <SelectTrigger className="w-36" aria-label="Filtrar por origen">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo origen</SelectItem>
            <SelectItem value="ai_agent">Agente IA</SelectItem>
            <SelectItem value="user">Operador</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          aria-label="Desde"
          className="w-36"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
        <Input
          type="date"
          aria-label="Hasta"
          className="w-36"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />

        <div className="ml-auto flex items-center gap-2">
          {pendingEvents > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full"
              onClick={() => {
                setSeenVersion(realtimeVersion);
                void list.refresh();
              }}
            >
              <RefreshCw className="size-3.5" />
              {pendingEvents} {pendingEvents === 1 ? "cambio nuevo" : "cambios nuevos"} · Actualizar
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={list.items.length === 0}>
            <Download className="size-3.5" /> Exportar CSV
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <DataTable<OrderRow>
          data={list.items}
          columns={columns}
          pagination={{ page: list.page, pageSize: 25, total: list.total }}
          onPageChange={list.setPage}
          search={{ field: "contact_name", value: list.searchValue ?? "" }}
          onSearchChange={({ value }) => list.setSearch(value)}
          preferredSearchFields={["contact_name"]}
          messages={{
            searchPlaceholder: () => "N° de pedido o cliente…",
            empty: "Aún no hay pedidos con estos filtros",
          }}
        />
      </div>
    </div>
  );
}
