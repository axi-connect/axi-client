"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CircleAlert, Handshake, Plane, Search, Wallet } from "lucide-react";

import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";
import { formatMoney } from "@/core/lib/format";
import { errorMessage } from "@/core/lib/error-messages";
import { EmptyState } from "@/shared/components/features/empty-state";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { groupReceivables, type ReceivableDTO, type ReceivablesStatsDTO } from "@/modules/collections/domain/receivable";
import {
  getReceivablesStats,
  listReceivables,
} from "@/modules/collections/infrastructure/services/collections-service.adapter";
import { ReceivableSectionList } from "@/modules/collections/ui/components/ReceivableSectionList";

type Filter = "todo" | "viajaron" | "mora";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "todo", label: "Todo" },
  { key: "viajaron", label: "Ya viajaron" },
  { key: "mora", label: "En mora" },
];

/**
 * La cartera (F4 del programa Cobros).
 *
 * Abre con la respuesta y no con la tabla: cuánto te deben, cuánto está
 * vencido y cuánto de eso es de gente que ya viajó. La proporción la da una
 * barra fina, y los importes los dice la frase — una leyenda de colores sería
 * repetir lo que ya está escrito.
 */
export function ReceivablesView() {
  const [filter, setFilter] = useState<Filter>("todo");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<ReceivableDTO[]>([]);
  const [stats, setStats] = useState<ReceivablesStatsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ blocked: boolean; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, totals] = await Promise.all([
        listReceivables({
          ...(filter === "viajaron" ? { travelled: true } : {}),
          ...(filter === "mora" ? { bucket: "overdue" } : {}),
          ...(search.trim() === "" ? {} : { q: search.trim() }),
          page_size: 100,
        }),
        getReceivablesStats(),
      ]);
      setRows(list.data);
      setStats(totals);
      setError(null);
    } catch (err) {
      // Sin la función el servidor responde 403: no es un fallo, es que este
      // negocio no tiene cartera. Se dice, no se disimula con una lista vacía.
      const blocked = isHttpError(err) && err.is(API_ERROR_CODES.featureDisabled);
      setError({ blocked, message: errorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const sections = useMemo(() => groupReceivables(rows), [rows]);

  if (error?.blocked === true) {
    return (
      <div className="mx-auto max-w-[1040px] px-10 py-10">
        <EmptyState
          icon={Wallet}
          accent="muted"
          title="Aquí no hay cartera"
          description="Este negocio cobra de una, así que no tiene cuotas que perseguir. La cartera se enciende en Mi empresa › Funciones."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1040px] flex-col gap-[30px] px-6 py-10 md:px-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[19px] font-semibold tracking-[-0.015em]">Cartera</h1>
      </div>

      {stats === null ? (
        <Skeleton className="h-28 w-full max-w-[560px] rounded-2xl" />
      ) : (
        <Hero stats={stats} travelledOnly={filter === "viajaron"} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Filtro de cartera"
          className="flex w-fit gap-0.5 rounded-full bg-secondary/60 p-0.5"
        >
          {FILTERS.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={filter === option.key}
              onClick={() => setFilter(option.key)}
              className={`h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors ${
                filter === option.key
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </nav>
        <label className="flex h-[34px] min-w-[230px] items-center gap-2 rounded-full bg-secondary px-3.5 text-[13px] text-muted-foreground">
          <Search aria-hidden="true" className="size-[15px]" />
          <span className="sr-only">Buscar cliente o pedido</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar cliente o pedido"
            className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[72px] w-full rounded-[18px]" />
          <Skeleton className="h-[72px] w-full rounded-[18px]" />
        </div>
      ) : sections.length === 0 ? (
        <EmptyState
          icon={Wallet}
          accent="muted"
          variant="solid"
          title="No te debe nadie"
          description="Cuando un pedido con plan de pagos quede con saldo, aparecerá aquí ordenado por a quién escribir primero."
        />
      ) : (
        <ReceivableSectionList sections={sections} />
      )}

      {error !== null && !error.blocked ? (
        <p className="text-[13px] text-destructive">{error.message}</p>
      ) : null}

      <p className="max-w-[72ch] px-1 text-[12.5px] leading-relaxed text-muted-foreground">
        El orden no es alfabético ni por importe: es <b className="font-medium text-foreground">a
        quién escribir primero</b>. Y el saldo sale del pedido, no de una copia — si mañana cambia
        su total, la cartera ya lo sabe.
      </p>
    </div>
  );
}

/** La respuesta antes que la tabla: una cifra, una barra fina y una frase. */
function Hero({ stats, travelledOnly }: { stats: ReceivablesStatsDTO; travelledOnly: boolean }) {
  const total = travelledOnly ? stats.travelled_cents : stats.outstanding_cents;
  const currentPct =
    stats.outstanding_cents <= 0
      ? 100
      : Math.max(0, ((stats.outstanding_cents - stats.overdue_cents) / stats.outstanding_cents) * 100);

  return (
    <div>
      <p className="text-[13px] text-muted-foreground">
        {travelledOnly ? "Ya viajaron y deben" : "Te deben"}
      </p>
      <p className="mt-1.5 font-headings text-[56px] leading-none tracking-[-0.03em] tabular-nums">
        {formatMoney(total)}
      </p>
      <div
        role="img"
        aria-label={`${String(Math.round(100 - currentPct))} por ciento de la cartera está vencida`}
        className="mt-[18px] h-1 max-w-[560px] rounded-full"
        style={{
          background: travelledOnly
            ? "var(--color-destructive)"
            : `linear-gradient(90deg, var(--color-success) 0% ${currentPct}%, var(--color-destructive) ${currentPct}% 100%)`,
        }}
      />
      <p className="mt-3 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-foreground">
        {travelledOnly ? (
          <>
            El servicio ya se prestó, así que no queda nada que retener: es la deuda que envejece
            más rápido.
          </>
        ) : (
          <>
            De {stats.plans_active} {stats.plans_active === 1 ? "pedido" : "pedidos"}.{" "}
            <b className="font-medium tabular-nums text-foreground">
              {formatMoney(stats.overdue_cents)}
            </b>{" "}
            <CircleAlert aria-hidden="true" className="inline size-3.5 align-[-2px]" /> están
            vencidos
            {stats.travelled_cents > 0 ? (
              <>
                , y{" "}
                <b className="font-medium tabular-nums text-foreground">
                  {formatMoney(stats.travelled_cents)}
                </b>{" "}
                <Plane aria-hidden="true" className="inline size-3.5 align-[-2px]" /> de eso es de
                gente que ya viajó
              </>
            ) : null}
            {stats.promised_cents > 0 ? (
              <>
                . <Handshake aria-hidden="true" className="inline size-3.5 align-[-2px]" />{" "}
                <b className="font-medium tabular-nums text-foreground">
                  {formatMoney(stats.promised_cents)}
                </b>{" "}
                con promesa de pago
              </>
            ) : null}
            .
          </>
        )}
      </p>
    </div>
  );
}
