"use client"

import type { ReactElement, Ref } from "react"
import { SearchBar } from "./components/SearchBar"
import { SelectionBanner } from "./components/SelectionBanner"
import { TableSearch } from "@/shared/components/features/table-search"
import type {
  TableSearchAction,
  TableSearchSuggestion,
} from "@/shared/components/features/table-search"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { TableView } from "./components/TableView"
import BasicPagination from "@/shared/components/ui/pagination"
import { useControlled, useDebouncedCallback, useSearchableFields } from "./utils/hooks"
import type { ColumnDef, DataRow, DataTableMessages, Primitive, RowContextMenuRenderer } from "./types"
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react"

export type { ColumnDef, DataRow } from "./types"
export { SelectionBanner } from "./components/SelectionBanner"
export type { SelectionBannerMessages } from "./components/SelectionBanner"

export type DataTableRef = {
  getCurrentPage: () => number
  goToPage: (page: number) => void
}

/**
 * Cómo se pinta el buscador de la tabla.
 *
 * - `none`  — no se pinta. Es el DEFAULT cuando no hay `onSearchChange`.
 * - `basic` — el buscador de siempre, con su selector de campo.
 * - `spotlight` — el buscador que se expande (fase 2b). Sin él montado, cae a
 *   `basic` y no rompe nada.
 */
export type DataTableSearchMode = "none" | "basic" | "spotlight"

/**
 * La selección de filas.
 *
 * **El ESTADO se queda en quien llama, no aquí.** Los botones de lote, los
 * permisos por fila —a un lead se le pueden buscar datos aunque no se pueda
 * promover— y el reseteo al cambiar de filtro ya viven en la vista; una
 * selección propiedad del componente habría que levantarla el primer día.
 * Lo que sube al compartido es la COLUMNA, que es lo que estaba copiado.
 */
export type DataTableSelection<T extends DataRow = DataRow> = {
  rowId: (row: T) => string
  selected: ReadonlySet<string>
  onChange: (next: ReadonlySet<string>) => void
  /** Qué filas se pueden marcar. Las demás salen con la casilla deshabilitada. */
  isSelectable?: (row: T) => boolean
  /** Obligatoria: una casilla sin nombre no se puede usar con lector de pantalla. */
  rowLabel: (row: T) => string
  /**
   * El segundo paso, «seleccionar los N que cumplen». Sin esto, la banda solo
   * resume la página.
   */
  allMatching?: {
    active: boolean
    /** De `meta.total`: es el número que ya está en pantalla. */
    count: number
    onSelectAll: () => void
    onClear: () => void
    limit?: number
  }
  /** Los botones de lote. Viven en la banda, que es donde se lee el número. */
  actions?: (ctx: { count: number; allMatching: boolean }) => React.ReactNode
  /** Un aviso bajo los botones. */
  note?: React.ReactNode
}

type DataTableProps<T extends DataRow = DataRow> = {
  // data
  data: T[]
  columns: ColumnDef<T>[]
  // row context menu
  rowContextMenu?: RowContextMenuRenderer<T>
  /** A la derecha del buscador: filtros, exportar, lo que la vista necesite. */
  toolbar?: React.ReactNode
  /** Fila completa bajo la barra. Para los chips de filtros activos. */
  banner?: React.ReactNode
  selection?: DataTableSelection<T>
  /**
   * Por defecto: `onSearchChange ? "basic" : "none"`.
   *
   * **Ese default ES el arreglo.** `SearchBar` se pintaba sin condición, y sin
   * `onSearchChange` no emite nada: nueve de las diecisiete tablas mostraban una
   * caja de búsqueda INERTE, y tres de ellas dibujaban además la suya al lado.
   * Es seguro porque `DataTable` nunca filtra `data` —solo emite—, así que una
   * caja sin manejador es código muerto demostrable.
   */
  searchMode?: DataTableSearchMode
  searchPlaceholder?: string
  /**
   * Lo que el buscador expandido ofrece debajo. Solo se usa con
   * `searchMode="spotlight"`.
   *
   * Por defecto se derivan de la PÁGINA YA CARGADA y el panel lo dice
   * («Coincidencias en esta página»): cero trabajo de backend y cero mentiras.
   * Quien quiera ir al servidor pasa las suyas.
   */
  searchSuggestions?: readonly TableSearchSuggestion[]
  searchSuggestionsLabel?: string
  searchActions?: readonly TableSearchAction[]
  searchLoading?: boolean
  // grouped meta
  pagination?: { page?: number; pageSize: number; total?: number }
  sorting?: { by: keyof T & string; dir?: "asc" | "desc" }
  search?: { field?: keyof T & string; value?: string }
  // handlers
  onPageChange?: (page: number) => void
  onSortChange?: (by: keyof T & string, dir: "asc" | "desc") => void
  onSearchChange?: (payload: { field: keyof T & string; value: string }) => void
  // search behavior
  searchDebounceMs?: number
  searchTrigger?: "debounced" | "submit"
  // i18n
  messages?: DataTableMessages
  // preferred search field order
  preferredSearchFields?: Array<keyof T & string>
}

/** El valor de una celda como texto plano, para el panel del buscador. */
function asText(value: Primitive): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "boolean") return value ? "Sí" : "No"
  return String(value)
}

export const DataTable = forwardRef(function DataTableInner<T extends DataRow = DataRow>({
  data,
  columns,
  sorting,
  search,
  messages,
  pagination,
  onPageChange,
  onSortChange,
  onSearchChange,
  rowContextMenu,
  preferredSearchFields,
  searchDebounceMs = 350,
  searchTrigger = "debounced",
  toolbar,
  banner,
  selection,
  searchMode,
  searchPlaceholder,
  searchSuggestions,
  searchSuggestionsLabel,
  searchActions,
  searchLoading,
}: DataTableProps<T>, ref: React.Ref<DataTableRef>) {

  const msgs: DataTableMessages = {
    searchPlaceholder: (label) => `Buscar por ${label}...`,
    searchButton: "Buscar",
    clearButton: "Limpiar",
    caption: (p, tp, tc) => `Página ${p} de ${tp} — ${tc} registros`,
    empty: "Sin resultados",
    yes: "Sí",
    no: "No",
    fieldLabelFallback: "campo",
    ...messages,
  }

  const [internalPage, setInternalPage] = useState<number>(pagination?.page ?? 1)
  
  useEffect(() => {
    if (typeof pagination?.page === "number") setInternalPage(pagination.page)
  }, [pagination?.page])

  const page = internalPage
  const pageSize = pagination?.pageSize ?? 10
  const totalCount = typeof pagination?.total === "number" ? pagination!.total! : data.length
  const start = (page - 1) * pageSize
  const clientSlice = data.slice(start, start + pageSize)
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const rowsToRender = typeof pagination?.total === "number" ? data : clientSlice
  const [localQuery, setLocalQuery] = useControlled<string>(search?.value ?? "", "")
  const mode: DataTableSearchMode = searchMode ?? (onSearchChange ? "basic" : "none")

  /**
   * La columna de selección la SINTETIZA el componente.
   *
   * Antes cada consumidor se la inventaba —y solo uno lo había hecho— con el
   * riesgo de que la casilla acabara en la posición equivocada o dentro del
   * panel «Ver más». Aquí va con `pinned: "start"`, `searchable: false` y su
   * ancho fijo, y no hay forma de declararla mal.
   */
  const selectionColumn = useMemo<ColumnDef<T> | null>(() => {
    if (!selection) return null
    const { rowId, selected, onChange, isSelectable, rowLabel } = selection
    const rows = rowsToRender
    const eligible = rows.filter((row) => isSelectable?.(row) ?? true)
    const marked = eligible.filter((row) => selected.has(rowId(row)))
    const allMarked = eligible.length > 0 && marked.length === eligible.length

    const toggleAll = () => {
      const next = new Set(selected)
      // Desde MIXTO se marca la página entera; solo se limpia cuando ya estaba
      // todo marcado. Es lo que la memoria muscular espera de una tabla.
      for (const row of eligible) {
        if (allMarked) next.delete(rowId(row))
        else next.add(rowId(row))
      }
      onChange(next)
    }

    return {
      id: "select",
      pinned: "start",
      searchable: false,
      minWidth: 44,
      headClassName: "w-11",
      cellClassName: "w-11",
      header: "",
      headerCell: () => (
        <Checkbox
          checked={allMarked}
          indeterminate={marked.length > 0 && !allMarked}
          disabled={eligible.length === 0}
          onChange={toggleAll}
          aria-label={
            allMarked
              ? `Quitar la selección de esta página`
              : `Seleccionar los ${eligible.length} de esta página`
          }
        />
      ),
      cell: ({ row }) => {
        const id = rowId(row.original)
        const can = isSelectable?.(row.original) ?? true
        return (
          <Checkbox
            checked={selected.has(id)}
            disabled={!can}
            aria-label={`Seleccionar ${rowLabel(row.original)}`}
            onChange={() => {
              const next = new Set(selected)
              if (next.has(id)) next.delete(id)
              else next.add(id)
              onChange(next)
            }}
          />
        )
      },
    }
  }, [selection, rowsToRender])

  const safeColumns = useMemo(() => {
    const usable = columns.filter((c) => c.accessorKey || c.cell || c.headerCell)
    return selectionColumn === null ? usable : [selectionColumn, ...usable]
  }, [columns, selectionColumn])

  const emitSearch = useCallback(
    (field: keyof T & string, value: string) => onSearchChange?.({ field, value }),
    [onSearchChange]
  )

  const debouncedEmit = useDebouncedCallback(emitSearch, searchDebounceMs, searchTrigger === "debounced")

  const searchableFields = useSearchableFields<T>(
    safeColumns,
    (preferredSearchFields as Array<keyof T & string>) ?? (["name", "nit", "city", "industry"] as Array<keyof T & string>)
  )

  const [localField, setLocalField] = useControlled<keyof T & string>(
    (search?.field as keyof T & string) ?? (searchableFields[0]?.key as keyof T & string),
    (searchableFields[0]?.key as keyof T & string)
  )

  const handleFieldChange = useCallback((key: string) => {
    setLocalField(key as keyof T & string)
    if (searchTrigger !== "submit") debouncedEmit(key as keyof T & string, localQuery)
  }, [debouncedEmit, localQuery, searchTrigger, setLocalField])

  const handleValueChange = useCallback((value: string) => {
    setLocalQuery(value)
    if (searchTrigger !== "submit") debouncedEmit(localField, value)
  }, [debouncedEmit, localField, searchTrigger, setLocalQuery])

  const handleSearchSubmit = useCallback(() => {
    emitSearch(localField, localQuery)
  }, [emitSearch, localField, localQuery])

  const handleClear = useCallback(() => {
    setLocalQuery("")
    if (searchTrigger === "submit") {
      emitSearch(localField, "")
    } else {
      debouncedEmit(localField, "")
    }
  }, [debouncedEmit, emitSearch, localField, searchTrigger, setLocalQuery])

  // expose imperative API
  useImperativeHandle(ref, () => ({
    getCurrentPage: () => page,
    goToPage: (p: number) => {
      const safe = Math.max(1, p)
      if (safe === page) return
      setInternalPage(safe)
      onPageChange?.(safe)
    },
  }), [onPageChange, page])

  /**
   * Las coincidencias, sacadas de la página ya cargada.
   *
   * Se buscan en las columnas BUSCABLES y se pintan con `formatCell`, o sea con
   * el mismo texto que la tabla. No promete más de lo que hay: el panel lo
   * etiqueta como «en esta página» y no como «en tu base».
   */
  const derivedSuggestions = useMemo<TableSearchSuggestion[]>(() => {
    if (mode !== "spotlight" || localQuery.trim().length === 0) return []
    const needle = localQuery.trim().toLowerCase()
    const fields = searchableFields.map((field) => field.key)
    const primary = fields[0]
    if (primary === undefined) return []
    return rowsToRender
      .filter((row) =>
        fields.some((key) => String(row[key] ?? "").toLowerCase().includes(needle)),
      )
      .slice(0, 5)
      .map((row, index) => ({
        id: `${String(row[primary] ?? "")}-${String(index)}`,
        label: asText(row[primary]),
        detail: fields
          .slice(1)
          .map((key) => asText(row[key]))
          .filter((part) => part.length > 0)
          .slice(0, 2)
          .join(" · "),
        onSelect: () => onSearchChange?.({ field: primary as keyof T & string, value: localQuery }),
      }))
  }, [mode, localQuery, searchableFields, rowsToRender, onSearchChange])

  const [searchOpen, setSearchOpen] = useState(false)

  const selectionCount = selection?.allMatching?.active
    ? selection.allMatching.count
    : (selection?.selected.size ?? 0)
  const showBand = selection !== undefined && selectionCount > 0

  return (
    <>
      {(mode !== "none" || toolbar !== undefined) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {mode === "spotlight" && (
            <TableSearch
              value={localQuery}
              onValueChange={handleValueChange}
              onSubmit={handleSearchSubmit}
              placeholder={searchPlaceholder}
              suggestions={searchSuggestions ?? derivedSuggestions}
              suggestionsLabel={
                searchSuggestionsLabel ??
                (searchSuggestions === undefined ? "Coincidencias en esta página" : "Coincidencias")
              }
              actions={searchActions}
              loading={searchLoading}
              onOpenChange={setSearchOpen}
            />
          )}
          {mode === "basic" && (
            <div className="min-w-[220px] flex-1">
              <SearchBar
                messages={msgs}
                value={localQuery}
                trigger={searchTrigger}
                fields={searchableFields}
                placeholder={searchPlaceholder}
                onSubmit={handleSearchSubmit}
                onFieldChange={handleFieldChange}
                onValueChange={handleValueChange}
                field={(localField as string) || (searchableFields[0]?.key as string)}
                onClear={handleClear}
              />
            </div>
          )}
          {toolbar}
        </div>
      )}

      {banner !== undefined && <div className="mb-3">{banner}</div>}

      {showBand && selection !== undefined && (
        <div className="mb-3">
          <SelectionBanner
            count={selectionCount}
            allMatching={selection.allMatching?.active ?? false}
            matchingTotal={selection.allMatching?.count}
            limit={selection.allMatching?.limit}
            onSelectAllMatching={selection.allMatching?.onSelectAll}
            onClear={() => {
              selection.allMatching?.onClear()
              selection.onChange(new Set())
            }}
            actions={selection.actions?.({
              count: selectionCount,
              allMatching: selection.allMatching?.active ?? false,
            })}
            note={selection.note}
          />
        </div>
      )}

      {/* El velo vive DENTRO del contenedor de la tabla, no como overlay fijo:
          así no negocia z-index con la cabecera del panel ni con el sidebar, que
          siguen encendidos, y el contexto de lo que se filtra sigue a la vista.
          Bloquea el clic a propósito — un clic que a la vez cierra el buscador y
          navega a una fila es una trampa. */}
      <div className="relative">
        {searchOpen && mode === "spotlight" && (
          <div
            aria-hidden="true"
            className="bg-background/60 motion-safe:animate-in motion-safe:fade-in-0 absolute inset-0 z-20 rounded-lg"
            onMouseDown={(event) => event.preventDefault()}
          />
        )}
      <TableView
        page={page}
        messages={msgs}
        pageSize={pageSize}
        data={rowsToRender}
        totalCount={totalCount}
        onSortChange={onSortChange}
        sortDir={sorting?.dir ?? "asc"}
        columns={safeColumns as ColumnDef<T>[]}
        sortBy={sorting?.by as keyof T & string}
        rowContextMenu={rowContextMenu as RowContextMenuRenderer<T> | undefined}
      />
      </div>

      <div className="flex justify-between items-center">
        <span className="text-muted-foreground mt-4 text-sm">{msgs?.caption?.(page, totalPages, totalCount)}</span>
        {onPageChange && (
          <div className="mt-2">
            <BasicPagination
              totalPages={Math.max(1, Math.ceil(totalCount / pageSize))}
              page={page}
              onPageChange={(p) => {
                if (p === page) return
                setInternalPage(p)
                onPageChange?.(p)
              }}
            />
          </div>
        )}
      </div>
    </>
  )
}) as <T extends DataRow = DataRow>(
  props: DataTableProps<T> & { ref?: Ref<DataTableRef> }
) => ReactElement

export default DataTable