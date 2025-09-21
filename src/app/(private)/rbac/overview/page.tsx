"use client"

import { RoleForm, ModuleForm } from "./form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { buildListParams } from "@/shared/query";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { RbacContextMenuItems } from "./table/table.actions";
import { Plus, Users2, LayoutDashboard } from "lucide-react";
import { RoleDetailSheet } from "./components/RoleDetailSheet";
import type { DataTableRef } from "@/components/ui/data-table";
import type { RbacOverviewRow, RbacOverviewView } from "../model";
import { OverviewProvider, useOverview } from "./form/overview.context";
import { modalHeaderTitles, modalHeaderDescriptions } from "./modal-texts";
import { rbacOverviewColumns, fetchRbacOverview } from "./table/table.config";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FloatingAlert, type FloatingAlertConfig } from "@/components/ui/floating-alert";

export default function RbacOverviewPage() {
  const pageSize = 10
  const searchParams = useSearchParams()
  const tableRef = useRef<DataTableRef>(null)
  const viewParam = (searchParams.get("view") as RbacOverviewView) || "summary"

  const [alertOpen, setAlertOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [rows, setRows] = useState<RbacOverviewRow[]>([]);
  const [searchValue, setSearchValue] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [formDefaults, setFormDefaults] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"role" | "module">("role");
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [sortBy, setSortBy] = useState<keyof RbacOverviewRow | undefined>();
  const [searchField, setSearchField] = useState<keyof RbacOverviewRow>("name");
  const [alertConfig, setAlertConfig] = useState<FloatingAlertConfig | null>(null);
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

  const onModalSubmitClick = () => {
    const formId = activeTab === "role" ? "rbac-role-form" : "rbac-module-form"
    const form = document.getElementById(formId) as HTMLFormElement | null
    form?.requestSubmit()
  }

  const setAlert = (cfg: { variant: "default" | "destructive" | "success"; title: string; description?: string }) => {
    setAlertConfig(cfg)
    setAlertOpen(true)
  }

  useEffect(() => { load(1); tableRef.current?.goToPage(1) }, [viewParam])

  useEffect(() => {
    const onEditOpen = (e: Event) => {
      const { defaults } = (e as CustomEvent).detail as { defaults: any }
      setFormMode("edit")
      setFormDefaults(defaults)
      setActiveTab("role")
      setModalOpen(true)
    }
    const onDeleteSuccess = async (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string | number; message?: string }
      setAlert({ variant: "success", title: detail?.message || "Rol eliminado correctamente" })
      const current = tableRef.current?.getCurrentPage() ?? 1
      await load(current)
    }
    const onDeleteError = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message?: string }
      setAlert({ variant: "destructive", title: detail?.message || "No se pudo eliminar el rol" })
    }
    const onError = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message?: string; status?: number }
      setAlert({ variant: "destructive", title: detail?.message || "Ocurrió un error" })
    }
    
    window.addEventListener("rbac:edit:open", onEditOpen)
    window.addEventListener("rbac:delete:success", onDeleteSuccess)
    window.addEventListener("rbac:delete:error", onDeleteError)
    window.addEventListener("rbac:error", onError)
    
    return () => {
      window.removeEventListener("rbac:edit:open", onEditOpen)
      window.removeEventListener("rbac:delete:success", onDeleteSuccess)
      window.removeEventListener("rbac:delete:error", onDeleteError)
      window.removeEventListener("rbac:error", onError)
    }
  }, [])

  return (
    <OverviewProvider>
    <div className="space-y-4">
      <ModulesRefreshOnModalOpen open={modalOpen} />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">RBAC Overview</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Visión general de roles, módulos y permisos.
        </p>
        <Button style={{ borderRadius: "9999px" }} variant="default" onClick={() => { setFormMode("create"); setFormDefaults(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4" />
          Crear rol
        </Button>
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

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        config={{
          title: modalHeaderTitles[activeTab][formMode],
          description: modalHeaderDescriptions[activeTab][formMode],
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true, id: "rbac-cancel" },
            { label: formMode === "edit" ? "Guardar cambios" : "Guardar", variant: "default", asClose: false, onClick: onModalSubmitClick, id: "rbac-save" },
          ],
        }}
      >
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <div className="flex justify-center items-center">
            <TabsList>
              <TabsTrigger value="role">
                <Users2 className="h-4 w-4" />
                Rol
              </TabsTrigger>
              <TabsTrigger value="module">
                <LayoutDashboard className="h-4 w-4" />
                Módulo
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="role">
            <RoleForm 
              host={{
                setAlert,
                defaultValues: formDefaults ?? undefined,
                refresh: () => load(tableRef.current?.getCurrentPage()),
                closeModal: () => setModalOpen(false),
              }}
              onSuccess={() => { setModalOpen(false); load(1) }} 
            />
          </TabsContent>

          <TabsContent value="module">
            <ModuleForm
              host={{
                setAlert,
                refresh: () => load(tableRef.current?.getCurrentPage()),
                closeModal: () => setModalOpen(false),
              }}
              onSuccess={() => { setModalOpen(false); load(1) }}
            />
          </TabsContent>
        </Tabs>
      </Modal>

      <FloatingAlert
        open={alertOpen}
        onOpenChange={setAlertOpen}
        config={{
          variant: alertConfig?.variant ?? "default",
          title: alertConfig?.title ?? "",
          description: alertConfig?.description,
          durationMs: 4000,
        }}
      />
    </div>
    </OverviewProvider>
  )
}

function ModulesRefreshOnModalOpen({ open }: { open: boolean }) {
  const { refreshModules } = useOverview()
  useEffect(() => { if (open) refreshModules() }, [open, refreshModules])
  return null
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border-soft p-4 bg-background/40">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  )
}