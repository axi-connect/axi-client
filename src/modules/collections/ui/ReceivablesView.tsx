"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleAlert,
  Handshake,
  Plane,
  Search,
  TriangleAlert,
  Wallet,
} from "lucide-react";

import { cn } from "@/core/lib/utils";

import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";
import { formatMoney } from "@/core/lib/format";
import { errorMessage } from "@/core/lib/error-messages";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/features/empty-state";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  groupReceivables,
  type ReceivableDTO,
  type ReceivablesStatsDTO,
} from "@/modules/collections/domain/receivable";
import {
  getReceivablesStats,
  listReceivables,
} from "@/modules/collections/infrastructure/services/collections-service.adapter";
import { useAuth } from "@/shared/auth/auth.hooks";
import { PromiseDialog } from "@/modules/collections/ui/components/PromiseDialog";
import { ReceivableSectionList } from "@/modules/collections/ui/components/ReceivableSectionList";
import { WriteFirstIsland } from "@/modules/collections/ui/components/WriteFirstIsland";
import { writeFirst } from "@/modules/collections/domain/write-first";
import { RescheduleDialog } from "@/modules/collections/ui/components/RescheduleDialog";
import { SendReminderDialog } from "@/modules/collections/ui/components/SendReminderDialog";

type Filter = "todo" | "viajaron" | "mora";

/** Filas por tanda. El tope del servidor es 100; pedir menos deja ver el botón. */
const PAGE_SIZE = 50;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "todo", label: "Todo" },
  { key: "viajaron", label: "Ya viajaron" },
  { key: "mora", label: "En mora" },
];

/**
 * La cartera (F4 del programa Cobros; bento en Cobros premium P4).
 *
 * Abre con la respuesta y no con la tabla: cuánto te deben, cuánto está
 * vencido y cuánto de eso es de gente que ya viajó. La proporción la da una
 * barra, y los importes los dice la frase — una leyenda de colores sería
 * repetir lo que ya está escrito. Al lado, la isla «Escribe primero a»: la
 * primera fila del orden, contada como decisión.
 */
export function ReceivablesView() {
  const [filter, setFilter] = useState<Filter>("todo");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<ReceivableDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<ReceivablesStatsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  /** A quién se le está escribiendo a mano; `null` = el diálogo está cerrado. */
  const [writing, setWriting] = useState<ReceivableDTO | null>(null);
  // F4b: anotar promesa y reprogramar desde «…» de la fila, solo con permiso.
  const { hasPermission } = useAuth();
  const canManage = hasPermission("collections:manage");
  const [promising, setPromising] = useState<ReceivableDTO | null>(null);
  const [rescheduling, setRescheduling] = useState<ReceivableDTO | null>(null);
  const [error, setError] = useState<{
    blocked: boolean;
    message: string;
  } | null>(null);

  const query = useCallback(
    (nextPage: number) =>
      listReceivables({
        ...(filter === "viajaron" ? { travelled: true } : {}),
        ...(filter === "mora" ? { bucket: "overdue" } : {}),
        ...(search.trim() === "" ? {} : { q: search.trim() }),
        page: nextPage,
        page_size: PAGE_SIZE,
      }),
    [filter, search],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, totals] = await Promise.all([
        query(1),
        getReceivablesStats(),
      ]);
      setRows(list.data);
      // El total viene en `meta` y hay que USARLO. Pedir cien filas y tirarlo
      // significa que a partir del deudor 101 la cartera se calla — y en una
      // pantalla cuyo propósito entero es «a quién le escribo», perder la cola
      // en silencio es el peor fallo posible.
      setTotal(list.meta.total);
      setPage(1);
      setStats(totals);
      setError(null);
    } catch (err) {
      // Sin la función el servidor responde 403: no es un fallo, es que este
      // negocio no tiene cartera. Se dice, no se disimula con una lista vacía.
      const blocked =
        isHttpError(err) && err.is(API_ERROR_CODES.featureDisabled);
      setError({ blocked, message: errorMessage(err) });
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [query]);

  async function loadMore() {
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const list = await query(page + 1);
      setRows((current) => [...current, ...list.data]);
      setTotal(list.meta.total);
      setPage((current) => current + 1);
    } catch (err) {
      // No se traga en silencio: pulsar y que no pase nada es la misma ilusión
      // de calma que la lista vacía por un fallo de red. Y no es un aviso que
      // se va a los 8 s (§9.4): es un ESTADO de la lista —quedó corta— que se
      // pinta al pie hasta que el reintento lo resuelva.
      setLoadMoreError(errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    void load();
  }, [load]);

  const sections = useMemo(() => groupReceivables(rows), [rows]);
  const first = useMemo(
    () => (loading || error !== null ? null : writeFirst(sections)),
    [loading, error, sections],
  );

  if (error?.blocked === true) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-10 md:py-10">
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
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 md:px-10 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="font-heading text-3xl leading-tight font-bold tracking-tight md:text-4xl">
            Cartera
          </h1>
          <p className="text-sm text-pretty text-muted-foreground">
            Ordenada por a quién escribir primero, no por nombre ni por monto.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2.5 md:w-auto">
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-card px-4 text-[13px] text-muted-foreground md:w-[300px] md:flex-none">
            <Search aria-hidden="true" className="size-4 shrink-0" />
            <span className="sr-only">Buscar cliente o pedido</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar cliente o pedido"
              className="w-full min-w-0 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          <nav
            aria-label="Filtro de cartera"
            className="flex w-fit gap-0.5 rounded-full border border-border bg-card p-1"
          >
            {FILTERS.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={filter === option.key}
                onClick={() => setFilter(option.key)}
                className={cn(
                  "h-9 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  filter === option.key
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-4 [&>*]:min-w-0",
          first !== null && "xl:grid-cols-[minmax(0,1fr)_minmax(17rem,21rem)]",
        )}
      >
        {stats === null ? (
          <Skeleton className="h-40 w-full rounded-3xl" />
        ) : (
          <Hero stats={stats} filter={filter} shown={total} />
        )}

        {first !== null ? (
          <WriteFirstIsland
            first={first}
            onWrite={setWriting}
            onPromise={canManage ? setPromising : undefined}
            className="xl:sticky xl:top-6 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:self-start"
          />
        ) : null}

        <div className="flex flex-col">
          {loading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-[76px] w-full rounded-3xl" />
              <Skeleton className="h-[76px] w-full rounded-3xl" />
            </div>
          ) : error !== null ? (
            // Un fallo de red NO es «no te debe nadie». Es el mismo principio del
            // 403, una rama más allá: se dice lo que pasó, no se disimula con una
            // lista vacía que hace creer que la cartera está limpia.
            <EmptyState
              icon={TriangleAlert}
              accent="amber"
              variant="solid"
              title="No se pudo cargar la cartera"
              description={error.message}
              action={
                <Button variant="outline" onClick={() => void load()}>
                  Reintentar
                </Button>
              }
            />
          ) : sections.length === 0 ? (
            <EmptyState
              icon={Wallet}
              accent="muted"
              variant="solid"
              title="No te debe nadie"
              description="Cuando un pedido con plan de pagos quede con saldo, aparecerá aquí ordenado por a quién escribir primero."
            />
          ) : (
            <>
              <ReceivableSectionList
                sections={sections}
                onWrite={setWriting}
                onPromise={canManage ? setPromising : undefined}
                onReschedule={canManage ? setRescheduling : undefined}
              />
              {rows.length < total ? (
                <div className="mt-6 flex flex-col items-center gap-2">
                  <p className="text-[12.5px] text-muted-foreground tabular-nums">
                    Mostrando {rows.length} de {total}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                  >
                    Ver más
                  </Button>
                  {loadMoreError !== null ? (
                    <Alert variant="destructive" className="mt-2 max-w-md">
                      <TriangleAlert aria-hidden="true" />
                      <AlertTitle>
                        No se pudo traer el resto de la cartera
                      </AlertTitle>
                      <AlertDescription>
                        <span>
                          {loadMoreError} La lista muestra solo lo que llegó.
                        </span>
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <p className="max-w-[72ch] px-1 text-[12.5px] leading-relaxed text-muted-foreground">
        El orden no es alfabético ni por importe: es{" "}
        <b className="font-medium text-foreground">a quién escribir primero</b>.
        Y el saldo sale del pedido, no de una copia — si mañana cambia su total,
        la cartera ya lo sabe.
      </p>

      {writing === null ? null : (
        <SendReminderDialog
          open
          orderId={writing.order_id}
          contactName={writing.contact_name}
          onOpenChange={(open) => {
            if (!open) setWriting(null);
          }}
          // Tras escribir, la fila tiene que decir «avisado hoy»: recargar es
          // la diferencia entre una pantalla que informa y una que miente
          // hasta que alguien pulse F5.
          onSent={() => void load()}
        />
      )}
      {promising === null ? null : (
        <PromiseDialog
          open
          orderId={promising.order_id}
          contactName={promising.contact_name}
          onOpenChange={(open) => {
            if (!open) setPromising(null);
          }}
          onDone={() => void load()}
        />
      )}
      {rescheduling === null ? null : (
        <RescheduleDialog
          open
          orderId={rescheduling.order_id}
          contactName={rescheduling.contact_name}
          onOpenChange={(open) => {
            if (!open) setRescheduling(null);
          }}
          onDone={() => void load()}
        />
      )}
    </div>
  );
}

/**
 * La respuesta antes que la tabla, en una ficha: la cifra, la barra de lo
 * vencido contra lo demás y la frase con los importes.
 */
function Hero({
  stats,
  filter,
  shown,
}: {
  stats: ReceivablesStatsDTO;
  filter: Filter;
  shown: number;
}) {
  // El titular describe LO QUE SE ESTÁ MIRANDO. Dejarlo en las cifras globales
  // mientras la lista está filtrada hace que la cabecera y la lista cuenten
  // cosas distintas, y la de arriba es la que se lee primero.
  const view =
    filter === "viajaron"
      ? {
          lede: "Ya viajaron y deben",
          total: stats.travelled_cents,
          solid: true,
          say: (
            <>
              {shown === 1 ? "Un cliente" : `${String(shown)} clientes`}. El
              servicio ya se prestó, así que no queda nada que retener: es la
              deuda que envejece más rápido.
            </>
          ),
        }
      : filter === "mora"
        ? {
            lede: "Vencido",
            total: stats.overdue_cents,
            solid: true,
            say: (
              <>
                De {shown === 1 ? "un pedido" : `${String(shown)} pedidos`},
                sobre un total por cobrar de{" "}
                <b className="font-medium tabular-nums text-foreground">
                  {formatMoney(stats.outstanding_cents)}
                </b>
                .
              </>
            ),
          }
        : {
            lede: "Te deben",
            total: stats.outstanding_cents,
            solid: false,
            say: (
              <>
                De {shown === 1 ? "un pedido" : `${String(shown)} pedidos`}.{" "}
                <b className="font-medium tabular-nums text-foreground">
                  {formatMoney(stats.overdue_cents)}
                </b>{" "}
                <CircleAlert
                  aria-hidden="true"
                  className="inline size-3.5 align-[-2px]"
                />{" "}
                están vencidos
                {stats.travelled_cents > 0 ? (
                  <>
                    , y{" "}
                    <b className="font-medium tabular-nums text-foreground">
                      {formatMoney(stats.travelled_cents)}
                    </b>{" "}
                    <Plane
                      aria-hidden="true"
                      className="inline size-3.5 align-[-2px]"
                    />{" "}
                    de eso es de gente que ya viajó
                  </>
                ) : null}
                {stats.promised_cents > 0 ? (
                  <>
                    .{" "}
                    <Handshake
                      aria-hidden="true"
                      className="inline size-3.5 align-[-2px]"
                    />{" "}
                    <b className="font-medium tabular-nums text-foreground">
                      {formatMoney(stats.promised_cents)}
                    </b>{" "}
                    con promesa de pago
                  </>
                ) : null}
                .
              </>
            ),
          };

  const overduePct =
    stats.outstanding_cents <= 0
      ? 0
      : Math.min(
          100,
          Math.max(0, (stats.overdue_cents / stats.outstanding_cents) * 100),
        );
  // Los conteos son de toda la cartera: con un filtro puesto contarían otra
  // cosa que la cifra de arriba, así que solo acompañan a «Te deben».
  const counts =
    filter === "todo"
      ? [
          { label: "Pedidos en mora", value: stats.plans_overdue },
          { label: "Clientes en mora", value: stats.contacts_overdue },
        ]
      : [];

  return (
    <section
      aria-label="Resumen de la cartera"
      className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 md:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-xs text-muted-foreground">{view.lede}</p>
          <p className="font-heading text-4xl leading-none font-bold tracking-tight whitespace-nowrap tabular-nums md:text-5xl">
            {formatMoney(view.total)}
          </p>
        </div>
        {counts.length > 0 ? (
          <dl className="flex gap-6 pb-1">
            {counts.map((count) => (
              <div key={count.label} className="flex flex-col gap-1">
                <dt className="text-xs whitespace-nowrap text-muted-foreground">
                  {count.label}
                </dt>
                <dd className="text-base font-semibold tabular-nums">
                  {count.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
      <div
        role="img"
        aria-label={`${String(Math.round(overduePct))} por ciento de la cartera está vencida`}
        className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted"
      >
        {view.solid ? (
          <span className="h-full w-full bg-destructive" />
        ) : (
          <>
            {overduePct > 0 ? (
              <span
                className="h-full bg-destructive"
                style={{ width: `${String(overduePct)}%` }}
              />
            ) : null}
            {overduePct < 100 ? (
              <span className="h-full flex-1 bg-foreground" />
            ) : null}
          </>
        )}
      </div>
      <p className="max-w-[72ch] text-[13.5px] leading-relaxed text-pretty text-muted-foreground">
        {view.say}
      </p>
    </section>
  );
}
