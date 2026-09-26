"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { formatMoney } from "@/core/lib/format";
import type { ListQuery } from "@/shared/api/query";
import { usePaginatedList } from "@/shared/api/use-paginated-list";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { EmptyState } from "@/shared/components/features/empty-state";
import { TableSkeleton } from "@/shared/components/features/loading";
import { StatePill } from "@/shared/components/features/bento";
import BasicPagination from "@/shared/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import {
  describePromotionKind,
  promotionCodes,
  redemptionProgressPct,
  type PromotionDTO,
  type RedemptionDTO,
} from "@/modules/marketing/domain/promotion";
import { LoadError, TableCard, TD, TH } from "@/modules/marketing/ui/components/premium";
import { listRedemptions } from "@/modules/marketing/infrastructure/services/promotions-service.adapter";

const PAGE_SIZE = 15;

/** «hoy, 10:12 a. m.», «ayer, 6:40 p. m.» o «22 sept»: lo reciente con hora, lo viejo solo con fecha. */
function formatWhen(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const time = date.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
  if (date.toDateString() === now.toDateString()) return `hoy, ${time}`;
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (date.toDateString() === yesterday.toDateString()) return `ayer, ${time}`;
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

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

  const pct = promotion ? redemptionProgressPct(promotion) : null;
  const code = promotion ? promotionCodes(promotion)[0] : undefined;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title={promotion ? promotion.name : "Canjes"}
      subtitle="Canjes de la promoción"
    >
      <div className="flex flex-col gap-5">
        {promotion ? (
          <div className="flex flex-col gap-3">
            <p className="flex flex-wrap items-center gap-2 text-sm">
              {code ? <span className="bg-muted rounded-md px-2 py-0.5 font-mono text-xs">{code}</span> : null}
              <span className="text-muted-foreground">{describePromotionKind(promotion)}</span>
            </p>
            <p className="flex flex-wrap items-baseline gap-x-2.5">
              <span className="font-heading text-5xl leading-none font-bold tracking-tight tabular-nums">
                {promotion.redemptions_count.toLocaleString("es-CO")}
              </span>
              <span className="text-muted-foreground text-[15px]">
                {promotion.max_redemptions_total !== null
                  ? `canjes de ${promotion.max_redemptions_total.toLocaleString("es-CO")} posibles`
                  : promotion.redemptions_count === 1
                    ? "canje · sin tope"
                    : "canjes · sin tope"}
              </span>
            </p>
            {pct !== null ? (
              <span aria-hidden="true" className="bg-muted h-2 overflow-hidden rounded-full">
                <span className="bg-accent-amber block h-full rounded-full" style={{ width: `${String(pct)}%` }} />
              </span>
            ) : null}
          </div>
        ) : null}

        {loading && items.length === 0 ? (
          <TableSkeleton rows={5} />
        ) : error ? (
          <LoadError message="No pudimos cargar los canjes de esta promoción" onRetry={() => void refresh()} />
        ) : items.length === 0 ? (
          <EmptyState
            glyph="money"
            variant="solid"
            title="Todavía nadie la ha usado"
            description="Aquí aparecerá cada pedido al que se le aplicó esta promoción, con el monto que descontó."
          />
        ) : (
          <TableCard>
            <Table>
              <caption className="sr-only">Canjes de la promoción</caption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={TH}>Cupón</TableHead>
                  <TableHead className={TH}>Cuándo</TableHead>
                  <TableHead className={`${TH} hidden @md:table-cell`}>
                    <span className="sr-only">Pedido</span>
                  </TableHead>
                  <TableHead className={`${TH} text-right`}>Aplicado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className={TD}>
                      <span className="bg-muted rounded-md px-2 py-0.5 font-mono text-xs">{row.coupon_code ?? "—"}</span>
                    </TableCell>
                    <TableCell className={`${TD} text-muted-foreground text-sm whitespace-nowrap`}>
                      {formatWhen(row.created_at)}
                    </TableCell>
                    <TableCell className={`${TD} hidden @md:table-cell`}>
                      <Link
                        href={`/orders/${row.order_id}`}
                        className="inline-flex min-h-6 items-center text-sm font-medium underline-offset-4 hover:underline"
                      >
                        Ver pedido
                      </Link>
                    </TableCell>
                    <TableCell className={`${TD} text-right tabular-nums`}>
                      {row.status === "applied" ? (
                        formatMoney(row.amount_applied_cents)
                      ) : (
                        <span className="inline-flex justify-end" title="El pedido se canceló">
                          <StatePill tone="neutral">Revertido</StatePill>
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="border-border flex items-center justify-between gap-2 border-t px-5 py-3">
                <p className="text-muted-foreground text-xs tabular-nums">
                  Página {page} de {totalPages}
                </p>
                <BasicPagination totalPages={totalPages} page={page} onPageChange={setPage} />
              </div>
            )}
          </TableCard>
        )}

        <p className="text-muted-foreground text-xs text-pretty">
          Un canje revertido es un pedido que se canceló: el cupón vuelve a quedar libre.
        </p>
      </div>
    </DetailSheet>
  );
}
