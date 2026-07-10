"use client"

import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages"
import { PermissionsMatrix } from "@/modules/rbac/ui/components/PermissionsMatrix"
import type { PermissionDTO } from "@/modules/rbac/domain/permission"
import type { RoleDTO } from "@/modules/rbac/domain/role"
import {
  createRole,
  listPermissions,
  setRolePermissions,
} from "@/modules/rbac/infrastructure/services/rbac-service.adapter"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"

/**
 * Formulario de rol:
 * - Crear: `POST /rbac/roles` (opcionalmente clonando permisos con
 *   `clone_from_role_id`, o marcando permisos en la matriz).
 * - Editar: los metadatos del rol son inmutables en el backend; lo editable
 *   es el set de permisos vía `PUT /rbac/roles/:id/permissions`.
 * - Roles system: todo en solo lectura.
 */
const roleFormSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido"),
  code: z
    .string()
    .trim()
    .min(2, "Código requerido")
    .regex(/^[a-z][a-z0-9_]*$/, "Solo minúsculas, números y guion bajo"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  clone_from_role_id: z.string().optional(),
})

type RoleFormValues = z.infer<typeof roleFormSchema>

export type RoleFormHost = {
  /** Rol existente → modo edición de permisos. */
  role?: RoleDTO | null
  /** Roles existentes para el selector de clonado (solo creación). */
  roles?: RoleDTO[]
  onSaved?: () => Promise<void> | void
  setAlert?: (cfg: { variant: "default" | "destructive" | "success"; title: string }) => void
}

export function RoleForm({ host }: { host: RoleFormHost }) {
  const isEdit = Boolean(host.role)
  const readOnly = Boolean(host.role?.is_system)
  const [permissions, setPermissions] = useState<PermissionDTO[]>([])
  const [selectedCodes, setSelectedCodes] = useState<string[]>(host.role?.permissions ?? [])
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: host.role?.name ?? "",
      code: host.role?.code ?? "",
      description: host.role?.description ?? "",
      clone_from_role_id: undefined,
    },
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await listPermissions()
        if (!cancelled) setPermissions(res.data)
      } catch (err) {
        host.setAlert?.({
          variant: "destructive",
          title: errorMessage(err, "No se pudo cargar el catálogo de permisos"),
        })
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Clonar rol: precarga la matriz con los permisos del rol elegido.
  const cloneFromId = form.watch("clone_from_role_id")
  useEffect(() => {
    if (!cloneFromId || isEdit) return
    const source = host.roles?.find((r) => r.id === cloneFromId)
    if (source) setSelectedCodes(source.permissions)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloneFromId])

  const cloneOptions = useMemo(() => host.roles ?? [], [host.roles])

  const handleSubmit = async (values: RoleFormValues) => {
    if (submitting || readOnly) return
    setSubmitting(true)
    try {
      if (isEdit && host.role) {
        await setRolePermissions(host.role.id, selectedCodes)
        host.setAlert?.({ variant: "success", title: "Permisos del rol actualizados" })
      } else {
        await createRole({
          name: values.name,
          code: values.code,
          ...(values.description ? { description: values.description } : {}),
          ...(values.clone_from_role_id ? { clone_from_role_id: values.clone_from_role_id } : {}),
          ...(selectedCodes.length > 0 && !values.clone_from_role_id
            ? { permission_codes: selectedCodes }
            : {}),
        })
        host.setAlert?.({ variant: "success", title: "Rol creado correctamente" })
      }
      await host.onSaved?.()
    } catch (err) {
      if (applyServerValidation(err, form)) return
      host.setAlert?.({
        variant: "destructive",
        title: errorMessage(err, isEdit ? "No se pudieron actualizar los permisos" : "No se pudo crear el rol"),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form id="role-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            name="name"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Soporte nivel 1" disabled={isEdit} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="code"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código</FormLabel>
                <FormControl>
                  <Input placeholder="support_l1" disabled={isEdit} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          name="description"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea placeholder="Qué puede hacer este rol" disabled={isEdit} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isEdit && cloneOptions.length > 0 && (
          <FormField
            name="clone_from_role_id"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Clonar permisos desde (opcional)</FormLabel>
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Empezar desde cero" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {cloneOptions.map((role) => (
                      <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div>
          <h3 className="mb-2 text-sm font-medium">
            Permisos{" "}
            {readOnly && <span className="text-muted-foreground">(rol de sistema, solo lectura)</span>}
          </h3>
          <PermissionsMatrix
            permissions={permissions}
            selected={selectedCodes}
            onChange={setSelectedCodes}
            readOnly={readOnly}
          />
        </div>
      </form>
    </Form>
  )
}
