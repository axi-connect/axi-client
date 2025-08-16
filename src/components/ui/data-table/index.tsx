"use client"

import { SearchBar } from "./SearchBar";
import { TableView } from "./TableView";
import { useCallback, useMemo } from "react";
import BasicPagination from "@/components/ui/pagination";
import type { ColumnDef, DataRow, DataTableMessages } from "./types";
import { useControlled, useDebouncedCallback, useSearchableFields } from "./hooks";

export type { ColumnDef, DataRow } from "./types"

type DataTableProps<T extends DataRow = DataRow> = {
  // data
  data: T[]
  columns: ColumnDef<T>[]
  // grouped meta
  pagination?: { page: number; pageSize: number; total?: number }
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

export function DataTable<T extends DataRow = DataRow>({
  data,
  columns,
  pagination,
  sorting,
  search,
  onPageChange,
  onSortChange,
  onSearchChange,
  searchDebounceMs = 350,
  searchTrigger = "debounced",
  messages,
  preferredSearchFields,
}: DataTableProps<T>) {

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

  const page = pagination?.page ?? 1
  const pageSize = pagination?.pageSize ?? 10
  const totalCount = typeof pagination?.total === "number" ? pagination!.total! : data.length
  const start = (page - 1) * pageSize
  const clientSlice = data.slice(start, start + pageSize)
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
      />

      {onPageChange && (
        <div className="mt-2">
          <BasicPagination totalPages={Math.max(1, Math.ceil(totalCount / pageSize))} initialPage={page} onPageChange={onPageChange} />
        </div>
      )}
    </>
  )
}

export default DataTable