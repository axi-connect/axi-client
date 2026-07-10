"use client"

import { Plus, Lock } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/shared/components/ui/badge"
import { Modal } from "@/shared/components/ui/modal"
import { Button } from "@/shared/components/ui/button"
import { errorMessage } from "@/core/lib/error-messages"
import { RoleForm } from "@/modules/rbac/ui/forms/RoleForm"
import type { RoleDTO } from "@/modules/rbac/domain/role"
import { listRoles } from "@/modules/rbac/infrastructure/services/rbac-service.adapter"
import { FloatingAlert, type FloatingAlertConfig } from "@/shared/components/ui/floating-alert"
import { Skeleton } from "@/shared/components/ui/skeleton"

/**
 * Roles y permisos (`/rbac/roles` + `/rbac/permissions`).
 * Los roles system (owner/admin/supervisor/operator) son inmutables; los
 * personalizados editan su set de permisos completo (PUT replace).
 */
export default function RolesPage() {
  const [roles, setRoles] = useState<RoleDTO[] | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RoleDTO | null>(null)
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertConfig, setAlertConfig] = useState<FloatingAlertConfig | null>(null)

  const setAlert = useCallback((cfg: FloatingAlertConfig) => {
    setAlertConfig(cfg)
    setAlertOpen(true)
  }, [])

  const load = useCallback(async () => {
    try {
      const res = await listRoles()
      setRoles(res.data)
    } catch (err) {
      setRoles([])
      setAlert({ variant: "destructive", title: errorMessage(err, "No se pudieron cargar los roles") })
    }
  }, [setAlert])

  useEffect(() => { void load() }, [load])

  const openCreate = () => { setSelectedRole(null); setModalOpen(true) }
  const openRole = (role: RoleDTO) => { setSelectedRole(role); setModalOpen(true) }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Roles y permisos</h1>
          <p className="text-sm text-muted-foreground">
            Define qué puede hacer cada rol. Los roles de sistema no se pueden modificar.
          </p>
        </div>
        <Button className="rounded-full" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Crear rol
        </Button>
      </div>

      {roles === null ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => openRole(role)}
              className="group rounded-xl border border-border-soft glass p-4 text-left shadow-sm transition-colors hover:border-brand/40 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{role.name}</span>
                    {role.is_system && <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label="Rol de sistema" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{role.code}</div>
                </div>
                <Badge variant={role.status === "active" ? "default" : "secondary"}>
                  {role.status === "active" ? "Activo" : "Archivado"}
                </Badge>
              </div>
              {role.description && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{role.description}</p>
              )}
              <div className="mt-3 text-xs text-muted-foreground">
                {role.permissions.length} permiso{role.permissions.length === 1 ? "" : "s"}
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        config={{
          title: selectedRole
            ? selectedRole.is_system ? `Rol ${selectedRole.name}` : `Editar permisos — ${selectedRole.name}`
            : "Crear rol",
          description: selectedRole
            ? selectedRole.is_system
              ? "Rol de sistema: solo lectura"
              : "Ajusta el set de permisos y guarda"
            : "Define el rol y sus permisos",
          className: "sm:max-w-2xl",
          actions: selectedRole?.is_system
            ? [{ label: "Cerrar", variant: "outline", asClose: true, id: "role-close" }]
            : [
                { label: "Cancelar", variant: "outline", asClose: true, id: "role-cancel" },
                {
                  label: selectedRole ? "Guardar permisos" : "Crear rol",
                  variant: "default",
                  asClose: false,
                  id: "role-save",
                  onClick: () => (document.getElementById("role-form") as HTMLFormElement | null)?.requestSubmit(),
                },
              ],
        }}
      >
        <RoleForm
          key={selectedRole?.id ?? "create"}
          host={{
            role: selectedRole,
            roles: roles ?? [],
            setAlert,
            onSaved: async () => {
              setModalOpen(false)
              await load()
            },
          }}
        />
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
  )
}
