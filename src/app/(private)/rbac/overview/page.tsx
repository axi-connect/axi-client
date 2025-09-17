"use client"

import { useSearchParams } from "next/navigation";
import { buildListParams } from "@/shared/query";
import { useEffect, useRef, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { RbacContextMenuItems } from "./table/table.actions";
import { RoleDetailSheet } from "./components/RoleDetailSheet";
import type { DataTableRef } from "@/components/ui/data-table";
import type { RbacOverviewRow, RbacOverviewView } from "../model";
import { rbacOverviewColumns, fetchRbacOverview } from "./table/table.config";

export default function RbacOverviewPage() {
  const pageSize = 10
  const searchParams = useSearchParams()
  const tableRef = useRef<DataTableRef>(null)
  const viewParam = (searchParams.get("view") as RbacOverviewView) || "summary"

  const [rows, setRows] = useState<RbacOverviewRow[]>([])
  const [searchValue, setSearchValue] = useState<string>("")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [total, setTotal] = useState<number | undefined>(undefined)
  const [sortBy, setSortBy] = useState<keyof RbacOverviewRow | undefined>()
  const [searchField, setSearchField] = useState<keyof RbacOverviewRow>("name")
  const [summary, setSummary] = useState<{ roles_count: number; modules_count: number; users_count: number } | null>(null)

  // no local builders — use shared helper inline in load

  async function load(p?: number, by = sortBy, dir: "asc" | "desc" = sortDir, field = searchField, value = searchValue) {
    const current = p ?? tableRef.current?.getCurrentPage() ?? 1
    const params = buildListParams<keyof RbacOverviewRow & string>({
      page: current,
      pageSize,
      sortBy: by as string | undefined,
      sortDir: dir,
      searchField: field as keyof RbacOverviewRow & string,
      searchValue: value,
      extra: { view: viewParam },
    })
    const { rows, summary, total } = await fetchRbacOverview(params)
    setRows(rows)
    setSummary(summary)
    setTotal(total)
  }

  const handleSortChange = async (by: keyof RbacOverviewRow, dir: "asc" | "desc") => {
    setSortBy(by)
    setSortDir(dir)
    await load(tableRef.current?.getCurrentPage(), by, dir)
  }

  const handleSearchChange = async ({ field, value }: { field: keyof RbacOverviewRow; value: string }) => {
    setSearchField(field)
    setSearchValue(value)
    await load(1, sortBy, sortDir, field, value)
    tableRef.current?.goToPage(1)
  }

  useEffect(() => { load(1); tableRef.current?.goToPage(1) }, [viewParam])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">RBAC Overview</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Visión general de roles, módulos y permisos.
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KpiCard label="Roles" value={summary.roles_count} />
          <KpiCard label="Módulos" value={summary.modules_count} />
          <KpiCard label="Usuarios" value={summary.users_count} />
        </div>
      )}

      <div className="rounded-xl border border-border-soft glass shadow-sm p-4 md:p-6">
        <DataTable
          data={rows}
          ref={tableRef}
          searchTrigger="submit"
          columns={rbacOverviewColumns}
          rowContextMenu={({ row }) => (
            <RbacContextMenuItems
              row={row}
              onViewClick={() => window.dispatchEvent(new CustomEvent("rbac:view:open", { detail: { defaults: row } }))}
              kind="context"
            />
          )}
          onSortChange={handleSortChange as any}
          onPageChange={(p) => { load(p) }}
          onSearchChange={handleSearchChange as any}
          pagination={{ pageSize, total }}
          search={{ field: searchField as any, value: searchValue }}
          sorting={{ by: sortBy as any, dir: sortDir }}
        />
      </div>
      <RoleDetailSheet />
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border-soft p-4 bg-background/40">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  )
}