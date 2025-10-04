"use client"

import { useEffect } from "react"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { buildListParams } from "@/shared/query"
import { DetailSheet } from "@/components/features/detail-sheet"
import { DataTable, type DataTableRef } from "@/components/features/data-table"
import { moduleColumns, fetchModules, type ModuleRow } from "../../modules/table/table.config"

export default function RbacInterceptModulesPage() {
  const pageSize = 10
  const router = useRouter()
  const tableRef = useRef<DataTableRef>(null)
  const [rows, setRows] = useState<ModuleRow[]>([])
  const [searchValue, setSearchValue] = useState<string>("")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [total, setTotal] = useState<number | undefined>(undefined)
  const [sortBy, setSortBy] = useState<keyof ModuleRow | undefined>()
  const [searchField, setSearchField] = useState<keyof ModuleRow>("name")

  useEffect(() => { load(1) }, [])

  async function load(
    p?: number,
    by = sortBy,
    dir: "asc" | "desc" = sortDir,
    field = searchField,
    value = searchValue
  ) {
    const current = p ?? tableRef.current?.getCurrentPage() ?? 1
    const params = buildListParams<keyof ModuleRow & string>({
      page: current,
      pageSize,
      sortBy: by as string | undefined,
      sortDir: dir,
      searchField: field as any,
      searchValue: value,
      extra: { view: "summary" },
    })
    const { rows, total } = await fetchModules(params)
    setRows(rows)
    setTotal(total)
  }

  return (
    <DetailSheet
      size={800} 
      open={true}
      // side="right"
      title="Módulos"
      portalTarget="body"
      id="modules-detail-sheet"
      subtitle="Lista de módulos del sistema"
      onOpenChange={(open) => { if (!open) router.back() }}
    >
      <div className="rounded-xl border border-border-soft glass shadow-sm p-4 md:p-6">
        <DataTable<ModuleRow>
          data={rows}
          ref={tableRef}
          searchTrigger="submit"
          columns={moduleColumns}
          onPageChange={(p) => { load(p) }}
          pagination={{ pageSize, total: total ?? 0 }}
          sorting={{ by: sortBy as any, dir: sortDir }}
          search={{ field: searchField as any, value: searchValue }}
          onSortChange={async (by, dir) => { setSortBy(by as keyof ModuleRow); setSortDir(dir); await load(tableRef.current?.getCurrentPage(), by as any, dir) }}
          onSearchChange={async ({ field, value }) => { setSearchField(field as any); setSearchValue(value); await load(1, sortBy, sortDir, field as any, value); tableRef.current?.goToPage(1) }}
        />
      </div>
    </DetailSheet>
  )
}