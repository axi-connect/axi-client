"use client"

import { useRouter } from "next/navigation";
import { buildListParams } from "@/shared/query";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DataTable } from "@/components/features/data-table";
import { useAlert } from "@/components/providers/alert-provider";
import type { DataTableRef } from "@/components/features/data-table";
import { OverviewKpis } from "../../../../modules/rbac/ui/components/OverviewKpis";
import { useOverview } from "../../../../modules/rbac/infrastructure/overview.context";
import type { RbacOverviewRow, RbacOverviewView } from "@/modules/rbac/domain/overview";
import { RoleDetailSheet } from "../../../../modules/rbac/ui/components/RoleDetailSheet";
import { RbacContextMenuItems } from "../../../../modules/rbac/ui/tables/overview.actions";
import { rbacOverviewColumns, fetchRbacOverview } from "../../../../modules/rbac/ui/tables/config/overview.config";

export default function RbacOverviewPage() {
  const pageSize = 10
  const searchParams = useSearchParams()
  const tableRef = useRef<DataTableRef>(null)
  const viewParam = (searchParams.get("view") as RbacOverviewView) || "summary"

  const router = useRouter()
  const { showAlert } = useAlert()
  const [rows, setRows] = useState<RbacOverviewRow[]>([])
  const { setSelectedRole, refreshModules } = useOverview()
  const [searchValue, setSearchValue] = useState<string>("")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [total, setTotal] = useState<number | undefined>(undefined)
  const [sortBy, setSortBy] = useState<keyof RbacOverviewRow | undefined>()
  const [searchField, setSearchField] = useState<keyof RbacOverviewRow>("name")
  const [summary, setSummary] = useState<{ roles_count: number; modules_count: number; users_count: number } | null>(null)

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

  useEffect(() => { load(1); tableRef.current?.goToPage(1); refreshModules() }, [viewParam])

  useEffect(() => {
    const onEditOpen = (e: Event) => {
      const { defaults } = (e as CustomEvent).detail as { defaults: any }
      setSelectedRole(defaults)
      console.log(defaults)
      router.push(`/rbac/roles/update/${defaults.id}`)
    }
    const onDeleteSuccess = async (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string | number; message?: string }
      showAlert({ tone: "success", title: detail?.message || "Rol eliminado correctamente", autoCloseMs: 4000 })
      const current = tableRef.current?.getCurrentPage() ?? 1
      await load(current)
    }
    const onError = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message?: string; status?: number }
      showAlert({ tone: "error", title: detail?.message || "Ocurrió un error" })
    }
    
    const onOverviewRefresh = (e: Event) => load(1)

    window.addEventListener("rbac:edit:open", onEditOpen)
    window.addEventListener("rbac:delete:success", onDeleteSuccess)
    window.addEventListener("rbac:delete:error", onError)
    window.addEventListener("rbac:error", onError)

    window.addEventListener("rbac:overview:refresh", onOverviewRefresh)
    return () => {
      window.removeEventListener("rbac:edit:open", onEditOpen)
      window.removeEventListener("rbac:delete:success", onDeleteSuccess)
      window.removeEventListener("rbac:delete:error", onError)
      window.removeEventListener("rbac:error", onError)
    }
  }, [])

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

      {summary && (<OverviewKpis summary={summary} />)}

      <div className="rounded-xl border border-border-soft glass shadow-sm p-4 md:p-6">
        <DataTable
          data={rows}
          ref={tableRef}
          searchTrigger="submit"
          columns={rbacOverviewColumns}
          pagination={{ pageSize, total }}
          onPageChange={(p) => { load(p) }}
          onSortChange={handleSortChange as any}
          onSearchChange={handleSearchChange as any}
          sorting={{ by: sortBy as any, dir: sortDir }}
          search={{ field: searchField as any, value: searchValue }}
          rowContextMenu={({ row }) => (
            <RbacContextMenuItems
              row={row}
              onViewClick={() => window.dispatchEvent(new CustomEvent("rbac:view:open", { detail: { defaults: row } }))}
              onEditClick={() => window.dispatchEvent(new CustomEvent("rbac:edit:open", { detail: { defaults: row } }))}
              onDeleteClick={() => window.dispatchEvent(new CustomEvent("rbac:delete:open", { detail: { row } }))}
              kind="context"
            />
          )}
        />
      </div>

      <RoleDetailSheet />
    </div>
  )
}