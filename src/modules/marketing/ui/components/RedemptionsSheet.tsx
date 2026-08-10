"use client";

import { useCallback, useMemo } from "react";
import { formatMoney, formatShortDate } from "@/core/lib/format";
import type { ListQuery } from "@/shared/api/query";
import { usePaginatedList } from "@/shared/api/use-paginated-list";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { EmptyState } from "@/shared/components/features/empty-state";
import { TableSkeleton } from "@/shared/components/features/loading";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import BasicPagination from "@/shared/components/ui/pagination";
import { Ticket } from "lucide-react";
import type { PromotionDTO, RedemptionDTO } from "@/modules/marketing/domain/promotion";
import { listRedemptions } from "@/modules/marketing/infrastructure/services/promotions-service.adapter";

const PAGE_SIZE = 15;

/**
 * Quién canjeó la promoción y por cuánto. Es el registro contable de la
 * promoción: una redención `reverted` NO desaparece — se marca, porque el
 * pedido se canceló y eso también hay que poder auditarlo.
 */
export function RedemptionsSheet({
  promotion,
  open,
  onOpenChange,
}: {
  promotion: PromotionDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const promotionId = promotion?.id ?? null;

  const fetcher = useCallback(
    async (params: ListQuery) => {
      if (!promotionId) return { data: [] as RedemptionDTO[], meta: { total: 0 } };
      return listRedemptions(promotionId, {
        page: params.page as number,
        page_size: params.page_size as number,
      });
    },
    [promotionId],
  );

  // `extraParams` debe ser estable o `usePaginatedList` entra en bucle de fetch.
  const extraParams = useMemo(() => ({}), []);

  const { items, total, loading, error, page, setPage, refresh } = usePaginatedList<RedemptionDTO>({
    fetcher,
    pageSize: PAGE_SIZE,
    extraParams,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title={promotion ? `Canjes de «${promotion.name}»` : "Canjes"}
      subtitle={
        total > 0
          ? `${total.toLocaleString("es-CO")} ${total === 1 ? "canje registrado" : "canjes registrados"}`
          : undefined
      }
    >
      {loading && items.length === 0 ? (
        <TableSkeleton rows={5} />
      ) : error ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/35 bg-destructive/5 px-4 py-3">
          <p className="flex-1 text-sm text-muted-foreground">
            No pudimos cargar los canjes de esta promoción.
          </p>
          <Button size="sm" variant="outline" onClick={() => void refresh()}>
            Reintentar
          </Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Ticket}
          accent="amber"
          variant="solid"
          title="Todavía nadie la ha usado"
          description="Aquí aparecerá cada pedido al que se le aplicó esta promoción, con el monto que descontó."
        />
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <caption className="sr-only">Canjes de la promoción</caption>
              <thead>
                <tr className="border-b border-border/60 bg-foreground/[0.02]">
                  <Th>Cupón</Th>
                  <Th>Pedido</Th>
                  <Th className="text-right">Descontó</Th>
                  <Th>Estado</Th>
                  <Th>Fecha</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 last:border-none">
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {row.coupon_code ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <a
                        href={`/orders/${row.order_id}`}
                        className="text-brand underline-offset-2 hover:underline"
                      >
                        Ver pedido
                      </a>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatMoney(row.amount_applied_cents)}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.status === "applied" ? (
                        <Badge
                          variant="outline"
                          className="border-success/40 bg-success/10 text-success"
                        >
                          Aplicada
                        </Badge>
                      ) : (
                        <Badge variant="outline" title="El pedido se canceló">
                          Revertida
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {formatShortDate(row.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs tabular-nums text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <BasicPagination totalPages={totalPages} page={page} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}
    </DetailSheet>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={`px-4 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground ${className ?? ""}`}
    >
      {children}
    </th>
  );
}
