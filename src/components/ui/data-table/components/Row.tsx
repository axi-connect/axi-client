"use client"

import { RowCollapse } from "./RowCollapse"
import { formatCell } from "../utils/helpers"
import { ContextMenu } from "@/components/ui/context-menu"
import { TableCell, TableRow } from "@/components/ui/table"
import { memo, useMemo, useState, useCallback } from "react"
import type { ColumnDef, DataRow, RowContextMenuRenderer } from "../types"

type DataTableRowProps<T extends DataRow> = {
  row: T
  visibleColumns: ColumnDef<T>[]
  collapsedColumns: ColumnDef<T>[]
  rowContextMenu?: RowContextMenuRenderer<T>
}

function DataTableRowInner<T extends DataRow>({ row, visibleColumns, collapsedColumns, rowContextMenu }: DataTableRowProps<T>) {
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
    <TableCell key={(col.accessorKey ?? col.id ?? idx) as string} className="first:pl-3 last:pr-3">
      {col.cell ? col.cell({ row: { original: row } }) : formatCell(col.accessorKey ? (row[col.accessorKey] as any) : undefined)}
    </TableCell>
  )), [row, visibleColumns])

  return (
    <>
      <TableRow onContextMenu={handleContextMenu}>
        {visibleCells}
      </TableRow>
      {collapsedColumns.length > 0 && (
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