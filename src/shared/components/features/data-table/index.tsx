"use client"

import type { ReactElement, Ref } from "react"
import { SearchBar } from "./components/SearchBar"
import { TableView } from "./components/TableView"
import BasicPagination from "@/shared/components/ui/pagination"
import { useControlled, useDebouncedCallback, useSearchableFields } from "./utils/hooks"
import type { ColumnDef, DataRow, DataTableMessages, RowContextMenuRenderer } from "./types"
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react"

export type { ColumnDef, DataRow } from "./types"

export type DataTableRef = {
  getCurrentPage: () => number
  goToPage: (page: number) => void
}

type DataTableProps<T extends DataRow = DataRow> = {
  // data
  data: T[]
  columns: ColumnDef<T>[]
  // row context menu
  rowContextMenu?: RowContextMenuRenderer<T>
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
  const safeColumns = useMemo(() => columns.filter((c) => c.accessorKey || c.cell), [columns])

  const emitSearch = useCallback(
    (field: keyof T & string, value: string) => onSearchChange?.({ field, value }),
    [onSearchChange]
  )

  const debouncedEmit = useDebouncedCallback(emitSearch, searchDebounceMs, searchTrigger === "debounced")

  const searchableFields = useSearchableFields<T>(
    safeColumns,
    (preferredSearchFields as Array<keyof T & string>) ?? (["name", "nit", "city", "industry"] as any)
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

  return (
    <>
      <div className="mb-3">
        <SearchBar
          messages={msgs}
          value={localQuery}
          trigger={searchTrigger}
          fields={searchableFields}
          onSubmit={handleSearchSubmit}
          onFieldChange={handleFieldChange}
          onValueChange={handleValueChange}
          field={(localField as string) || (searchableFields[0]?.key as string)}
          onClear={handleClear}
        />
      </div>

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