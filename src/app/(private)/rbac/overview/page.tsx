"use client"

import KpiCard from "./components/kpi-card";
import { buildListParams } from "@/shared/query";
import { useEffect, useRef, useState } from "react";
import { useOverview } from "../context/overview.context";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable } from "@/components/features/data-table";
import { RbacContextMenuItems } from "./table/table.actions";
import { useAlert } from "@/components/providers/alert-provider"
import { RoleDetailSheet } from "./components/role-detail-sheet";
import type { RbacOverviewRow, RbacOverviewView } from "../model";
import type { DataTableRef } from "@/components/features/data-table";
import { LayoutDashboard, CircleUserRound, ShieldUser} from "lucide-react";
import { rbacOverviewColumns, fetchRbacOverview } from "./table/table.config";

export default function RbacOverviewPage() {
  const pageSize = 10
  const router = useRouter()
  const { showAlert } = useAlert()
  const searchParams = useSearchParams()
  const tableRef = useRef<DataTableRef>(null)
  const { refreshRole, refreshModules } = useOverview()
  const viewParam = (searchParams.get("view") as RbacOverviewView) || "summary"

  const [rows, setRows] = useState<RbacOverviewRow[]>([]);
  const [searchValue, setSearchValue] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<keyof RbacOverviewRow | undefined>();
  const [searchField, setSearchField] = useState<keyof RbacOverviewRow>("name");
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

  useEffect(() => {
    const onEditOpen = (e: Event) => {
      const { defaults } = (e as CustomEvent).detail as { defaults: any }
      refreshRole(defaults)
      if (defaults?.id != null) router.push(`/rbac/roles/update/${defaults.id}`)
    }
    const onDeleteSuccess = async (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string | number; message?: string }
      showAlert({
        open: true,
        tone: "success",
        autoCloseMs: 3000,
        title: detail?.message || "Rol eliminado correctamente",
      })
      const current = tableRef.current?.getCurrentPage() ?? 1
      await load(current)
    }
    const onDeleteError = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message?: string }
      showAlert({
        open: true,
        tone: "error",
        autoCloseMs: 3000,
        title: detail?.message || "No se pudo eliminar el rol",
      })
    }
    const onError = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message?: string; status?: number }
      showAlert({
        open: true,
        tone: "error",
        autoCloseMs: 3000,
        title: detail?.message || "Ocurrió un error",
      })
    }
    const onRefreshOverview = () => {
      load(1)
    }

    window.addEventListener("rbac:edit:open", onEditOpen)
    window.addEventListener("rbac:delete:success", onDeleteSuccess)
    window.addEventListener("rbac:delete:error", onDeleteError)
    window.addEventListener("rbac:error", onError)

    const onRoleCreate = () => router.push("/rbac/roles/create")
    const onModuleCreate = () => router.push("/rbac/modules/create")
    window.addEventListener("Roles:create:open", onRoleCreate)
    window.addEventListener("Módulos:create:open", onModuleCreate)

    window.addEventListener("rbac:refresh:overview", onRefreshOverview)
    
    return () => {
      window.removeEventListener("rbac:edit:open", onEditOpen)
      window.removeEventListener("rbac:delete:success", onDeleteSuccess)
      window.removeEventListener("rbac:delete:error", onDeleteError)
      window.removeEventListener("rbac:error", onError)
      window.removeEventListener("Roles:create:open", onRoleCreate)
      window.removeEventListener("Módulos:create:open", onModuleCreate)
    }
  }, [])

  const KPI_CARDS = [
    { 
      label: "Roles", 
      value: summary?.roles_count ?? 0, 
      icon: <ShieldUser className="h-6 w-6" />,
      href: "/rbac/roles",
    },
    { 
      label: "Módulos", 
      value: summary?.modules_count ?? 0, 
      icon: <LayoutDashboard className="h-6 w-6" />,
      href: "/rbac/modules",
    },
    { 
      label: "Usuarios", 
      value: summary?.users_count ?? 0, 
      icon: <CircleUserRound className="h-6 w-6" />,
      href: "/admin/users",
    },
  ]

  return (
    <div className="space-y-4 relative">
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
          {KPI_CARDS.map((card) => (
            <KpiCard key={card.label} {...card} />
          ))}
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
              onEditClick={() => window.dispatchEvent(new CustomEvent("rbac:edit:open", { detail: { defaults: row } }))}
              onDeleteClick={() => window.dispatchEvent(new CustomEvent("rbac:delete:open", { detail: { row } }))}
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