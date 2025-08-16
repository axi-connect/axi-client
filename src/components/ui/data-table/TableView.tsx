import { Button } from "@/components/ui/button"
import { ariaSortFrom, formatCell } from "./helpers"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import type { ColumnDef, DataRow, DataTableMessages } from "./types"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type TableViewProps<T extends DataRow> = {
  data: T[]
  columns: ColumnDef<T>[]
  page: number
  pageSize: number
  totalCount: number
  sortBy?: keyof T & string
  sortDir?: "asc" | "desc"
  onSortChange?: (by: keyof T & string, dir: "asc" | "desc") => void
  messages: DataTableMessages
}

export function TableView<T extends DataRow>({ data, columns, page, pageSize, totalCount, sortBy, sortDir = "asc", onSortChange, messages }: TableViewProps<T>) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  return (
    <Table>
      <TableCaption aria-live="polite">
        {messages.caption ? messages.caption(page, totalPages, totalCount) : `Página ${page} de ${totalPages} — ${totalCount} registros`}
      </TableCaption>

      <TableHeader className="bg-muted">
        <TableRow>
          {columns.map((col, idx) => {
            const key = (col.accessorKey ?? col.id ?? String(idx)) as keyof T & string
            const isActive = !!(sortBy && sortBy === col.accessorKey)
            const Icon = isActive ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
            return (
              <TableHead key={String(key)} className="first:pl-3 last:pr-3">
                {col.sortable && col.accessorKey && onSortChange ? (
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 p-0"
                    onClick={() => {
                      const next: "asc" | "desc" = sortBy === key ? (sortDir === "asc" ? "desc" : "asc") : "asc"
                      onSortChange(key, next)
                    }}
                    aria-sort={ariaSortFrom(sortBy, sortDir, key)}
                  >
                    {col.header ?? (col.accessorKey as string)}
                    <Icon className="h-4 w-4 text-primary" />
                  </Button>
                ) : (
                  <>{col.header ?? (col.accessorKey as string) ?? ""}</>
                )}
              </TableHead>
            )
          })}
        </TableRow>
      </TableHeader>

      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={Math.max(1, columns.length)} className="text-center text-muted-foreground">
              {messages.empty ?? "Sin resultados"}
            </TableCell>
          </TableRow>
        ) : (
          data.map((row, idx) => (
            <TableRow key={idx}>
              {columns.map((col, cIdx) => (
                <TableCell key={(col.accessorKey ?? col.id ?? cIdx) as string} className="first:pl-3 last:pr-3">
                  {col.cell ? col.cell({ row: { original: row } }) : formatCell(col.accessorKey ? (row[col.accessorKey] as any) : undefined, messages.yes ?? "Sí", messages.no ?? "No")}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}