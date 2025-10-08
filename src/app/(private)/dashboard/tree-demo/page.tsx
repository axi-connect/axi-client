"use client"

import { Button } from "@/components/ui/button"
import { useEffect, useMemo, useState } from "react"
import { TreeView, type TreeNode } from "@/components/features/tree-view"

type Intention = {
  id: number
  code: string
  flow_name: string
  description: string
  ai_instructions: string
  priority: "low" | "medium" | "high"
  type: string
}

type Group = { id: string; label: string; children?: any[] }

export default function Page() {
  const [types] = useState(["Payments", "Support", "Sales"])
  const [flows] = useState(["Cancel", "Status", "Refund"]) 
  const [data, setData] = useState<Group[]>(() =>
    types.map((t) => ({ id: `type-${t}`, label: t, children: flows.map((f) => ({ id: `${t}::${f}`, label: f, children: [] })) }))
  )

  const mapToNode = (item: any): TreeNode<Intention | any> => {
    if (Array.isArray(item.children)) {
      return { id: item.id, label: item.label, children: item.children.map(mapToNode) }
    }
    const i = item as Intention
    return { id: `int-${i.id}`, label: i.code, isLeaf: true, meta: i }
  }

  const [offsetByFlow, setOffsetByFlow] = useState<Record<string, number>>({})

  async function fetchMore(flowId: string, typeLabel: string, flowLabel: string) {
    const offset = offsetByFlow[flowId] || 0
    const res = await fetch(`/api/demo/intentions?type=${encodeURIComponent(typeLabel)}&flow=${encodeURIComponent(flowLabel)}&limit=30&offset=${offset}`)
    const { data } = await res.json()
    setData((prev) => prev.map((g) => {
      if (g.id !== `type-${typeLabel}`) return g
      return {
        ...g,
        children: g.children?.map((c) => c.id === flowId ? { ...c, children: [...(c.children || []), ...data.intentions] } : c)
      }
    }))
    setOffsetByFlow((p) => ({ ...p, [flowId]: offset + 30 }))
  }

  return (
    <div className="p-4">
      <div className="rounded-md border">
        <TreeView
          data={data}
          mapToNode={mapToNode}
          title="Demo: TreeView"
          header={({ expandAll, collapseAll }) => (
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={expandAll}>Expandir todo</Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>Colapsar todo</Button>
                <Button onClick={() => window.location.reload()}>Reset</Button>
            </div>
          )}
          getPriority={(n) => (n.meta as any)?.priority}
          renderDescription={(n) => (n.meta as any)?.description}
          loadChildren={async (node) => {
            // if clicking a type or flow that has no children yet, fetch first page
            const [typeLabel, flowLabel] = node.id.includes("::")
              ? node.id.split("::")
              : [node.label, flows[0]]
            const flowId = node.id.includes("::") ? node.id : `${node.label}::${flows[0]}`
            await fetchMore(flowId, typeLabel.replace("type-", ""), flowLabel)
            // children are already pushed to data; return empty to avoid duplication
            return []
          }}
        />
      </div>
    </div>
  )
}