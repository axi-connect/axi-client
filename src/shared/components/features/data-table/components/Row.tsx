"use client"

import { ChevronDown } from "lucide-react"
import { CollapsedFields, RowCollapse } from "./RowCollapse"
import { formatCell } from "../utils/helpers"
import { ContextMenu } from "@/shared/components/ui/context-menu"
import { TableCell, TableRow } from "@/shared/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip"
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
      <TableRow onContextMenu={handleContextMenu} className={iconMode ? "group/row" : undefined}>
        {visibleCells}
        {iconMode && (
          // Pegado al borde derecho: si la tabla desplaza a lo ancho, el botón no se pierde.
          // Necesita fondo opaco (tapa lo que pasa por debajo), así que COPIA el de la fila:
          // el mismo tinte al pasar el ratón y al estar seleccionada. Con `bg-card` fijo se
          // veía como un recuadro aparte, sobre todo en oscuro.
          <TableCell className="sticky right-0 w-10 bg-card pr-3 pl-0 text-right transition-colors group-hover/row:bg-[color-mix(in_srgb,var(--color-muted)_50%,var(--color-card))] group-data-[state=selected]/row:bg-muted">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setDetailOpen((open) => !open)}
                  aria-expanded={detailOpen}
                  // Solo apunta al panel cuando existe: cerrado no hay nada con ese id.
                  aria-controls={detailOpen ? detailId : undefined}
                  // Nombre FIJO: el estado lo dice `aria-expanded`, no un rótulo que cambia.
                  aria-label="Ver más datos"
                  className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/50 inline-grid size-7 place-items-center rounded-full outline-none focus-visible:ring-[3px]"
                >
                  <ChevronDown aria-hidden className={cn("size-4 transition-transform motion-reduce:transition-none", detailOpen && "rotate-180")} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {detailOpen ? "Ocultar" : `Ver ${collapsedColumns.map((col) => col.header ?? "").filter(Boolean).join(", ")}`}
              </TooltipContent>
            </Tooltip>
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