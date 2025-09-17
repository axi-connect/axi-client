"use client"

 import { useCallback, useEffect, useState } from "react"
import { DetailSheet } from "@/components/detail-sheet"
import { getRbacOverviewRoleDetail } from "../../service"
import type { RbacOverviewRow, RbacRoleDTO } from "../../model"

/**
 * RoleDetailSheet
 *
 * Listens to the custom event "rbac:view:open" with payload { defaults: RbacOverviewRow }
 * and renders a responsive DetailSheet with a rich role detail view.
 *
 * Optimizations:
 * - Uses DetailSheet's fetchDetail for deferred loading with built-in skeleton handling
 * - Minimal state (row + fetched detail)
*/
export function RoleDetailSheet() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<RbacOverviewRow | null>(null)
  const [detail, setDetail] = useState<RbacRoleDTO | null>(null)

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail as { defaults: RbacOverviewRow }
      setRow(detail.defaults)
      setOpen(true)
    }
    window.addEventListener("rbac:view:open", onOpen)
    return () => window.removeEventListener("rbac:view:open", onOpen)
  }, [])

  const fetchDetail = useCallback(async (id: number | undefined) => {
    if (!id) return
    const { data } = await getRbacOverviewRoleDetail(id)
    setDetail(data.roles[0])
    return data
  }, [])

  return (
    <DetailSheet
      open={open}
      id={row?.id}
      title="Detalle RBAC"
      onOpenChange={setOpen}
      fetchDetail={row ? fetchDetail : undefined}
      subtitle={row ? `${row.name} • ${row.code}` : undefined}
      skeleton={<div className="animate-pulse h-24 bg-secondary rounded" />}
    >
      {detail && (
        <div className="space-y-6">
          {/* <pre>{JSON.stringify(detail, null, 2)}</pre> */}

          <section className="space-y-1">
            <h3 className="text-lg font-semibold">{detail.name}</h3>
            {detail.description && (
              <p className="text-sm text-muted-foreground">{detail.description}</p>
            )}
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Módulos</h4>
            <div className="space-y-3">
              {detail.modules?.map((m) => (
                <div key={m.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{m.name} <span className="text-xs text-muted-foreground">({m.code})</span></div>
                      <div className="text-xs text-muted-foreground truncate">/{m.path}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${m.is_public ? "text-green-700 border-green-200 bg-green-50" : "text-amber-700 border-amber-200 bg-amber-50"}`}>
                      {m.is_public ? "Público" : "Privado"}
                    </span>
                  </div>
                  {m.permissions?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {m.permissions.map((p) => (
                        <span key={p} className="text-[10px] px-2 py-0.5 rounded-full border bg-secondary text-foreground/80">
                          {p}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {m.submodules?.length ? (
                    <div className="mt-3 border-t border-border pt-3 space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">Submódulos</div>
                      <div className="space-y-2">
                        {m.submodules.map((s) => (
                          <div key={s.id} className="rounded-md border border-border/70 p-2">
                            <div className="flex flex-wrap items-center gap-2 justify-between">
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{s.name} <span className="text-xs text-muted-foreground">({s.code})</span></div>
                                <div className="text-xs text-muted-foreground truncate">/{s.path}</div>
                              </div>
                            </div>
                            {s.permissions?.length ? (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {s.permissions.map((p) => (
                                  <span key={p} className="text-[10px] px-2 py-0.5 rounded-full border bg-muted text-foreground/80">
                                    {p}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </DetailSheet>
  )
}