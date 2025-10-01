"use client"

import { memo, useId } from "react"
import { formatCell } from "../utils/helpers"
import { useRowCollapse } from "../utils/hooks"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ColumnDef, DataRow } from "../types"
import { motion, AnimatePresence } from "framer-motion"
import { TableCell, TableRow } from "@/components/ui/table"

type RowCollapseProps<T extends DataRow> = {
  row: T
  collapsedColumns: ColumnDef<T>[]
}

function RowCollapseInner<T extends DataRow>({ row, collapsedColumns }: RowCollapseProps<T>) {
  const { open, toggle } = useRowCollapse(false)
  const panelId = useId()

  return (
    <TableRow className="bg-muted/10">
      <TableCell colSpan={999} className="p-0">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            aria-expanded={open}
            aria-controls={panelId}
            className="flex items-center gap-2"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : "rotate-0"}`} />
            <span className="text-sm">{open ? "Ver menos" : "Ver más"}</span>
          </Button>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                id={panelId}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 gap-2 py-2 sm:grid-cols-2">
                  {collapsedColumns.map((col, idx) => (
                    <div key={(col.accessorKey ?? col.id ?? idx) as string} className="rounded-md border border-border-soft bg-background px-3 py-2">
                      <div className="text-xs text-foreground/60">{col.header ?? (col.accessorKey as string)}</div>
                      <div className="text-sm font-medium mt-1">
                        {col.cell ? col.cell({ row: { original: row } }) : formatCell(col.accessorKey ? (row[col.accessorKey] as any) : undefined)}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </TableCell>
    </TableRow>
  )
}

export const RowCollapse = memo(RowCollapseInner) as typeof RowCollapseInner