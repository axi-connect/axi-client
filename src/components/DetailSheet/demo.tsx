"use client"

import * as React from "react"
import { DetailSheet } from "." 

type Item = { id: number; name: string; email: string }
const ITEMS: Item[] = Array.from({ length: 8 }).map((_, i) => ({ id: i + 1, name: `Cliente ${i + 1}`, email: `cliente${i + 1}@axi.dev` }))

export default function DetailSheetDemo() {
  const [open, setOpen] = React.useState(false)
  const [selectedId, setSelectedId] = React.useState<number | undefined>()
  const [content, setContent] = React.useState<string>("")

  const fetchDetail = async (id: number) => {
    setContent("")
    await new Promise((r) => setTimeout(r, 600))
    setContent(`Detalle del cliente ${id}: Información extendida, notas, actividades…`)
    return {}
  }

  const onRowClick = (id: number) => {
    setSelectedId(id)
    setOpen(true)
  }

  return (
    <div className="p-4">
      <h2 className="font-semibold text-xl mb-3">Demo DetailSheet</h2>
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-accent)]/10">
            <tr className="text-left">
              <th className="p-2">ID</th>
              <th className="p-2">Nombre</th>
              <th className="p-2">Email</th>
            </tr>
          </thead>
          <tbody>
            {ITEMS.map((it) => (
              <tr key={it.id} className="border-t hover:bg-secondary/50 cursor-pointer" onClick={() => onRowClick(it.id)}>
                <td className="p-2">{it.id}</td>
                <td className="p-2">{it.name}</td>
                <td className="p-2">{it.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DetailSheet
        open={open}
        onOpenChange={setOpen}
        id={selectedId}
        title={selectedId ? `Cliente #${selectedId}` : "Cliente"}
        subtitle="Información general"
        fetchDetail={selectedId ? fetchDetail : undefined}
        skeleton={<div className="animate-pulse h-24 bg-secondary rounded" />}
      >
        {content ? <p>{content}</p> : <p className="text-muted-foreground">Seleccione un cliente para ver el detalle.</p>}
      </DetailSheet>
    </div>
  )
}