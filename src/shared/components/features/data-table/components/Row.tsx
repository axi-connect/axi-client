"use client"

import { ChevronDown } from "lucide-react"
import { CollapsedFields, RowCollapse } from "./RowCollapse"
import { formatCell } from "../utils/helpers"
import { ContextMenu } from "@/shared/components/ui/context-menu"
import { TableCell, TableRow } from "@/shared/components/ui/table"
import { memo, useId, useMemo, useState, useCallback } from "react"
import type { ColumnDef, DataRow, RowContextMenuRenderer } from "../types"
import { cn } from "@/core/lib/utils"

type DataTableRowProps<T extends DataRow> = {
  row: T
  visibleColumns: ColumnDef<T>[]
  collapsedColumns: ColumnDef<T>[]
  rowContextMenu?: RowContextMenuRenderer<T>
  /** `icon`: lo que no cabe se abre con un botón al final de la fila, no con un renglón bajo cada una. */
  collapseMode?: "row" | "icon"
}

function DataTableRowInner<T extends DataRow>({ row, visibleColumns, collapsedColumns, rowContextMenu, collapseMode = "row" }: DataTableRowProps<T>) {
  const [detailOpen, setDetailOpen] = useState(false)
  const detailId = useId()
  const iconMode = collapseMode === "icon" && collapsedColumns.length > 0
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (!rowContextMenu) return
    e.preventDefault()
    setMenuOpen(false)
    setMenuPos({ x: e.clientX, y: e.clientY })
    requestAnimationFrame(() => setMenuOpen(true))
  }, [rowContextMenu])

  const visibleCells = useMemo(() => visibleColumns.map((col, idx) => (
    <TableCell
      key={(col.accessorKey ?? col.id ?? idx) as string}
      className={cn("first:pl-3 last:pr-3", col.cellClassName)}
    >
      {col.cell ? col.cell({ row: { original: row } }) : formatCell(col.accessorKey ? (row[col.accessorKey] as Parameters<typeof formatCell>[0]) : undefined)}
    </TableCell>
  )), [row, visibleColumns])

  return (
    <>
      <TableRow onContextMenu={handleContextMenu}>
        {visibleCells}
        {iconMode && (
          <TableCell className="w-10 pr-3 pl-0 text-right">
            <button
              type="button"
              onClick={() => setDetailOpen((open) => !open)}
              aria-expanded={detailOpen}
              aria-controls={detailId}
              aria-label={detailOpen ? "Ver menos" : `Ver más: ${collapsedColumns.map((col) => col.header ?? "").filter(Boolean).join(", ")}`}
              className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/50 inline-grid size-7 place-items-center rounded-full outline-none focus-visible:ring-[3px]"
            >
              <ChevronDown aria-hidden className={cn("size-4 transition-transform motion-reduce:transition-none", detailOpen && "rotate-180")} />
            </button>
          </TableCell>
        )}
      </TableRow>
      {iconMode && detailOpen && (
        <TableRow className="bg-muted/10">
          <TableCell id={detailId} colSpan={999} className="px-3 py-1">
            <CollapsedFields row={row} collapsedColumns={collapsedColumns} />
          </TableCell>
        </TableRow>
      )}
      {collapseMode === "row" && collapsedColumns.length > 0 && (
        <RowCollapse row={row} collapsedColumns={collapsedColumns} />
      )}
      {rowContextMenu && menuOpen && (
        <ContextMenu open={menuOpen} position={menuPos} onOpenChange={setMenuOpen}>
          {rowContextMenu({ row })}
        </ContextMenu>
      )}
    </>
  )
}

export const DataTableRow = memo(DataTableRowInner) as typeof DataTableRowInner