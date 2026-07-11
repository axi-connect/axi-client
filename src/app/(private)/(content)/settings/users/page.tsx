"use client"

import { Plus } from "lucide-react"
import { Modal } from "@/shared/components/ui/modal"
import { Button } from "@/shared/components/ui/button"
import { useEffect, useMemo, useRef, useState } from "react"
import type { UserRow } from "@/modules/users/domain/user"
import { UserForm } from "@/modules/users/ui/forms/UserForm"
import type { UserFormValues } from "@/modules/users/ui/forms/config/user.config"
import { DataTable, type DataTableRef } from "@/shared/components/features/data-table"
import { FloatingAlert, type FloatingAlertConfig } from "@/shared/components/ui/floating-alert"
import { fetchUsers, userColumns } from "@/modules/users/ui/tables/config/users.config"

/**
 * Usuarios del tenant (`/users`). La colección no pagina en el servidor:
 * búsqueda/orden/paginación se resuelven en cliente sobre el set completo.
 */
export default function UsersPage() {
  const pageSize = 10
  const tableRef = useRef<DataTableRef>(null)
  const [allRows, setAllRows] = useState<UserRow[]>([])

  const [searchValue, setSearchValue] = useState("")
  const [searchField, setSearchField] = useState<keyof UserRow & string>("name")
  const [sortBy, setSortBy] = useState<(keyof UserRow & string) | undefined>()
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const [modalOpen, setModalOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [formDefaults, setFormDefaults] = useState<(Partial<UserFormValues> & { id?: string }) | null>(null)
  const [alertConfig, setAlertConfig] = useState<FloatingAlertConfig | null>(null)

  const setAlert = (cfg: FloatingAlertConfig) => {
    setAlertConfig(cfg)
    setAlertOpen(true)
  }

  async function load() {
    try {
      const { rows } = await fetchUsers()
      setAllRows(rows)
    } catch {
      setAlert({ variant: "destructive", title: "No se pudieron cargar los usuarios" })
    }
  }

  useEffect(() => { void load() }, [])

  // Búsqueda + orden en cliente (la colección completa vive en memoria).
  const rows = useMemo(() => {
    let result = allRows
    if (searchValue) {
      const needle = searchValue.toLowerCase()
      result = result.filter((row) => String(row[searchField] ?? "").toLowerCase().includes(needle))
    }
    if (sortBy) {
      result = [...result].sort(
        (a, b) => String(a[sortBy] ?? "").localeCompare(String(b[sortBy] ?? "")) * (sortDir === "asc" ? 1 : -1),
      )
    }
    return result
  }, [allRows, searchValue, searchField, sortBy, sortDir])

  useEffect(() => {
    const onMutationSuccess = () => {
      setAlert({ variant: "success", title: "Usuario eliminado correctamente" })
      void load()
    }
    const onError = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message?: string }
      setAlert({ variant: "destructive", title: detail?.message || "No se pudo completar la acción" })
    }
    const onEditOpen = (e: Event) => {
      const { defaults } = (e as CustomEvent).detail as { defaults: Partial<UserFormValues> & { id: string } }
      setFormMode("edit")
      setFormDefaults(defaults)
      setModalOpen(true)
    }

    window.addEventListener("users:delete:success", onMutationSuccess)
    window.addEventListener("users:error", onError)
    window.addEventListener("users:edit:open", onEditOpen)
    window.addEventListener("users:view:open", onEditOpen)
    return () => {
      window.removeEventListener("users:delete:success", onMutationSuccess)
      window.removeEventListener("users:error", onError)
      window.removeEventListener("users:edit:open", onEditOpen)
      window.removeEventListener("users:view:open", onEditOpen)
    }
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl tracking-tight font-semibold">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Crea y gestiona los usuarios de tu empresa y sus roles.
          </p>
        </div>
        <Button
          className="rounded-full"
          onClick={() => { setFormMode("create"); setFormDefaults(null); setModalOpen(true) }}
        >
          <Plus className="h-4 w-4" />
          Crear usuario
        </Button>
      </div>

      <div className="rounded-xl border border-border-soft glass shadow-sm p-4 md:p-6">
        <DataTable<UserRow>
          data={rows}
          ref={tableRef}
          columns={userColumns}
          searchTrigger="submit"
          pagination={{ pageSize }}
          search={{ field: searchField, value: searchValue }}
          sorting={{ by: sortBy as keyof UserRow, dir: sortDir }}
          onSortChange={(by, dir) => { setSortBy(by); setSortDir(dir) }}
          onSearchChange={({ field, value }) => {
            setSearchField(field)
            setSearchValue(value)
            tableRef.current?.goToPage(1)
          }}
        />

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

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        config={{
          title: formMode === "edit" ? "Editar usuario" : "Crear usuario",
          description: formMode === "edit"
            ? "Actualiza la información del usuario y guarda los cambios"
            : "Completa la información del usuario para registrarlo",
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true, id: "user-cancel" },
            {
              label: formMode === "edit" ? "Guardar cambios" : "Guardar",
              variant: "default",
              asClose: false,
              id: "user-save",
              onClick: () => (document.getElementById("user-form") as HTMLFormElement | null)?.requestSubmit(),
            },
          ],
        }}
      >
        <UserForm
          host={{
            formMode,
            setAlert,
            closeModal: () => setModalOpen(false),
            defaultValues: formDefaults,
            refresh: load,
          }}
        />
      </Modal>
    </div>
  )
}
