"use client"

import { useMemo } from "react"
import { Badge } from "@/shared/components/ui/badge"
import { Switch } from "@/shared/components/ui/switch"
import {
  INTENTION_PRIORITY_LABELS,
  INTENTION_TYPE_LABELS,
  type IntentionDTO,
  type IntentionType,
} from "@/modules/agents/domain/intentions"

/**
 * Editor de asignación de intenciones a un agente (controlado).
 * La selección es un set de `intention_id`; los `requirements` por intención
 * se envían vacíos desde la UI (los define el backend/plataforma por ahora).
 */
export function AgentIntentionsEditor({
  intentions,
  selected,
  onChange,
}: {
  intentions: IntentionDTO[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
}) {
  const groups = useMemo(() => {
    const byType = new Map<IntentionType, IntentionDTO[]>()
    for (const intention of intentions) {
      const list = byType.get(intention.type) ?? []
      list.push(intention)
      byType.set(intention.type, list)
    }
    return [...byType.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [intentions])

  const toggle = (id: string, checked: boolean) => {
    const next = new Set(selected)
    if (checked) next.add(id)
    else next.delete(id)
    onChange(next)
  }

  if (intentions.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay intenciones disponibles todavía.</p>
  }

  return (
    <div className="space-y-3">
      {groups.map(([type, items]) => (
        <div key={type} className="rounded-lg border border-border">
          <div className="border-b border-border bg-muted/40 px-3 py-2 text-sm font-medium">
            {INTENTION_TYPE_LABELS[type]}
          </div>
          <ul className="divide-y divide-border">
            {items.map((intention) => (
              <li key={intention.id} className="flex items-center justify-between gap-4 px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{intention.code}</span>
                    <Badge variant="secondary">{INTENTION_PRIORITY_LABELS[intention.priority]}</Badge>
                    {intention.is_system && <Badge variant="outline">Sistema</Badge>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{intention.description}</p>
                </div>
                <Switch
                  checked={selected.has(intention.id)}
                  onCheckedChange={(checked: boolean) => toggle(intention.id, checked)}
                  aria-label={`Asignar intención ${intention.code}`}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
