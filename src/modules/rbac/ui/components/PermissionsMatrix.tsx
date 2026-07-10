"use client"

import { useMemo } from "react"
import { Badge } from "@/shared/components/ui/badge"
import { Switch } from "@/shared/components/ui/switch"
import { groupPermissionsByResource, type PermissionDTO } from "@/modules/rbac/domain/permission"

/**
 * Matriz de permisos agrupada por `resource` (filas = `action`).
 * Componente controlado: recibe los `codes` seleccionados y notifica cambios;
 * en modo `readOnly` solo pinta el estado (roles system).
 */
export function PermissionsMatrix({
  permissions,
  selected,
  onChange,
  readOnly = false,
}: {
  permissions: PermissionDTO[]
  selected: string[]
  onChange?: (codes: string[]) => void
  readOnly?: boolean
}) {
  const groups = useMemo(() => groupPermissionsByResource(permissions), [permissions])
  const selectedSet = useMemo(() => new Set(selected), [selected])

  const toggle = (code: string, checked: boolean) => {
    if (readOnly || !onChange) return
    const next = new Set(selectedSet)
    if (checked) next.add(code)
    else next.delete(code)
    onChange([...next])
  }

  const toggleResource = (codes: string[], checked: boolean) => {
    if (readOnly || !onChange) return
    const next = new Set(selectedSet)
    for (const code of codes) {
      if (checked) next.add(code)
      else next.delete(code)
    }
    onChange([...next])
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const codes = group.permissions.map((p) => p.code)
        const selectedCount = codes.filter((c) => selectedSet.has(c)).length
        const allSelected = selectedCount === codes.length

        return (
          <div key={group.resource} className="rounded-lg border border-border">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium capitalize">{group.resource.replaceAll("_", " ")}</span>
                <Badge variant="secondary">{selectedCount}/{codes.length}</Badge>
              </div>
              {!readOnly && (
                <Switch
                  checked={allSelected}
                  onCheckedChange={(checked: boolean) => toggleResource(codes, checked)}
                  aria-label={`Seleccionar todos los permisos de ${group.resource}`}
                />
              )}
            </div>
            <ul className="divide-y divide-border">
              {group.permissions.map((permission) => (
                <li key={permission.id} className="flex items-center justify-between gap-4 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm capitalize">{permission.action.replaceAll("_", " ")}</div>
                    {permission.description && (
                      <div className="truncate text-xs text-muted-foreground">{permission.description}</div>
                    )}
                  </div>
                  <Switch
                    checked={selectedSet.has(permission.code)}
                    disabled={readOnly}
                    onCheckedChange={(checked: boolean) => toggle(permission.code, checked)}
                    aria-label={permission.code}
                  />
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
