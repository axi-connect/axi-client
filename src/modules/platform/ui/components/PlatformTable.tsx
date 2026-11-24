"use client";

/**
 * La tabla del panel de plataforma (rediseño F1, mockup aprobado). Reemplaza
 * las cuatro versiones que conviven hoy (`DataTable`, `Table`, `<table>` crudo
 * y listas expandibles); las vistas la adoptan en su fase (F2–F5).
 *
 * - Vive en su tarjeta; si no cabe, scrollea DENTRO con la barra de axi y
 *   nunca empuja la página (regla `tablas-sin-desborde`).
 * - La fila entera abre el detalle (`rowHref` u `onRowClick`), con teclado.
 * - Acciones de la fila al pasar el ratón o con foco; en táctil, siempre a la
 *   vista (no hay hover).
 * - En el celular (< 700 px) la fila pasa a tarjeta (`mobileCard`): nada de
 *   columnas escondidas sin alternativa.
 * - Búsqueda, orden y paginación declarados una sola vez y hechos sobre la
 *   lista COMPLETA (`domain/table.ts`): el pie cuenta sobre el total.
 *
 * No envuelve al `DataTable` compartido: su colapso de columnas en un panel
 * «Ver más» es justo lo que la fila → tarjeta sustituye (decisión anotada en el
 * informe de F1).
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { SearchField } from "@/shared/components/ui/search-field";
import { filterRows, paginate, sortRowsBy, type SortDir, type SortValue } from "../../domain/table";

export type PlatformColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Con esto la columna se puede ordenar. */
  sortValue?: (row: T) => SortValue;
  align?: "start" | "end";
  headClassName?: string;
  cellClassName?: string;
};

type PlatformTableProps<T> = {
  /** Nombre accesible de la tabla («Empresas»). */
  label: string;
  rows: readonly T[];
  columns: readonly PlatformColumn<T>[];
  rowKey: (row: T) => string;
  /** La fila entera abre esto. */
  rowHref?: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** El nombre de la fila para el lector de pantalla («Abrir Norte Studio»). */
  rowLabel?: (row: T) => string;
  rowActions?: (row: T) => React.ReactNode;
  /** La fila como tarjeta en el celular. */
  mobileCard: (row: T) => React.ReactNode;
  search?: { placeholder: string; textsOf: (row: T) => readonly (string | null | undefined)[] };
  pageSize?: number;
  defaultSort?: { id: string; dir: SortDir };
  /** A la derecha del buscador: filtros, exportar. */
  toolbar?: React.ReactNode;
  /** Sin filas de origen (lo decide quien llama: un error NUNCA llega aquí como vacío). */
  empty: React.ReactNode;
  /** Sin coincidencias con la búsqueda. */
  noResults?: React.ReactNode;
  /** Unidad del pie («empresas»). */
  unit?: string;
  className?: string;
};

function SortIcon({ dir }: { dir: SortDir | null }) {
  if (dir === "asc") return <ArrowUp aria-hidden="true" className="size-3.5" />;
  if (dir === "desc") return <ArrowDown aria-hidden="true" className="size-3.5" />;
  return <ChevronsUpDown aria-hidden="true" className="size-3.5 opacity-50" />;
}

export function PlatformTable<T>({
  label,
  rows,
  columns,
  rowKey,
  rowHref,
  onRowClick,
  rowLabel,
  rowActions,
  mobileCard,
  search,
  pageSize = 10,
  defaultSort,
  toolbar,
  empty,
  noResults,
  unit = "registros",
  className,
}: PlatformTableProps<T>) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ id: string; dir: SortDir } | null>(defaultSort ?? null);

  const filtered = useMemo(() => (search ? filterRows(rows, query, search.textsOf) : [...rows]), [rows, query, search]);
  const sorted = useMemo(() => {
    const column = sort ? columns.find((c) => c.id === sort.id) : undefined;
    return column?.sortValue && sort ? sortRowsBy(filtered, column.sortValue, sort.dir) : filtered;
  }, [filtered, sort, columns]);
  const slice = paginate(sorted, page, pageSize);

  const clickable = Boolean(rowHref || onRowClick);
  const open = (row: T) => {
    if (onRowClick) onRowClick(row);
    else if (rowHref) router.push(rowHref(row));
  };

  const toggleSort = (id: string) => {
    setPage(1);
    setSort((current) =>
      current?.id !== id ? { id, dir: "asc" } : current.dir === "asc" ? { id, dir: "desc" } : null,
    );
  };

  const onSearch = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  if (rows.length === 0) return <>{empty}</>;

  return (
    <div className={cn("flex min-w-0 flex-col gap-3", className)}>
      {search || toolbar ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {search ? (
            <SearchField
              value={query}
              onChange={onSearch}
              placeholder={search.placeholder}
              label={`Buscar en ${label}`}
              className="w-full sm:w-72"
            />
          ) : (
            <span />
          )}
          {toolbar ? <div className="flex min-w-0 flex-wrap items-center gap-2">{toolbar}</div> : null}
        </div>
      ) : null}

      <div className="min-w-0 overflow-hidden rounded-3xl border border-border bg-card">
        {slice.total === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            {noResults ?? "Nada coincide con la búsqueda."}
          </div>
        ) : (
          <>
            {/* Escritorio y tableta: la tabla, con su propio scroll horizontal. */}
            <div className="axi-scroll hidden overflow-x-auto overscroll-x-contain min-[700px]:block">
              <table className="w-full border-collapse text-[13.5px]" aria-label={label}>
                <thead>
                  <tr>
                    {columns.map((column) => {
                      const dir = sort?.id === column.id ? sort.dir : null;
                      return (
                        <th
                          key={column.id}
                          scope="col"
                          aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : undefined}
                          className={cn(
                            "border-b border-border bg-muted/40 px-4 py-3 text-left text-xs font-medium whitespace-nowrap text-muted-foreground",
                            column.align === "end" && "text-right",
                            column.headClassName,
                          )}
                        >
                          {column.sortValue ? (
                            <button
                              type="button"
                              onClick={() => toggleSort(column.id)}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
                                column.align === "end" && "flex-row-reverse",
                              )}
                            >
                              {column.header}
                              <SortIcon dir={dir} />
                            </button>
                          ) : (
                            column.header
                          )}
                        </th>
                      );
                    })}
                    {rowActions ? (
                      <th scope="col" className="w-px border-b border-border bg-muted/40 px-2 py-3">
                        <span className="sr-only">Acciones</span>
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {slice.rows.map((row) => (
                    <tr
                      key={rowKey(row)}
                      data-clickable={clickable || undefined}
                      tabIndex={clickable ? 0 : undefined}
                      aria-label={clickable && rowLabel ? rowLabel(row) : undefined}
                      onClick={clickable ? () => open(row) : undefined}
                      onKeyDown={
                        clickable
                          ? (event) => {
                              if (event.target !== event.currentTarget) return;
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                open(row);
                              }
                            }
                          : undefined
                      }
                      className={cn(
                        "group/row border-b border-border-soft last:border-b-0",
                        clickable &&
                          "cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                      )}
                    >
                      {columns.map((column) => (
                        <td
                          key={column.id}
                          className={cn(
                            "px-4 py-3 align-middle",
                            column.align === "end" && "text-right tabular-nums",
                            column.cellClassName,
                          )}
                        >
                          {column.cell(row)}
                        </td>
                      ))}
                      {rowActions ? (
                        // Las acciones no abren la fila.
                        <td className="px-2 py-2 text-right" onClick={(event) => event.stopPropagation()}>
                          <div className="inline-flex items-center gap-1 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100 [@media(hover:hover)]:group-focus-within/row:opacity-100 [@media(hover:hover)]:has-[[data-state=open]]:opacity-100">
                            {rowActions(row)}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Celular: cada fila es una tarjeta. */}
            <ul className="min-[700px]:hidden" aria-label={label}>
              {slice.rows.map((row) => (
                <li key={rowKey(row)} className="flex items-start gap-2 border-b border-border-soft px-4 py-3.5 last:border-b-0">
                  {rowHref ? (
                    <Link
                      href={rowHref(row)}
                      aria-label={rowLabel?.(row)}
                      className="min-w-0 flex-1 rounded-md focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      {mobileCard(row)}
                    </Link>
                  ) : onRowClick ? (
                    <button
                      type="button"
                      onClick={() => onRowClick(row)}
                      aria-label={rowLabel?.(row)}
                      className="min-w-0 flex-1 rounded-md text-left focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      {mobileCard(row)}
                    </button>
                  ) : (
                    <div className="min-w-0 flex-1">{mobileCard(row)}</div>
                  )}
                  {rowActions ? <div className="shrink-0">{rowActions(row)}</div> : null}
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border px-4 py-3 text-[12.5px] text-muted-foreground">
          <span className="tabular-nums">
            {slice.total === 0
              ? `0 de ${String(rows.length)} ${unit}`
              : slice.total === rows.length
                ? `${String(slice.from)}–${String(slice.to)} de ${String(slice.total)} ${unit}`
                : `${String(slice.from)}–${String(slice.to)} de ${String(slice.total)} que coinciden · ${String(rows.length)} ${unit} en total`}
          </span>
          {slice.pageCount > 1 ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(slice.page - 1)}
                disabled={slice.page <= 1}
                aria-label="Página anterior"
                className="grid size-8 place-items-center rounded-full border border-border text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
              </button>
              <span className="px-2 tabular-nums" aria-live="polite">
                Página {slice.page} de {slice.pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage(slice.page + 1)}
                disabled={slice.page >= slice.pageCount}
                aria-label="Página siguiente"
                className="grid size-8 place-items-center rounded-full border border-border text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring"
              >
                <ChevronRight aria-hidden="true" className="size-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
