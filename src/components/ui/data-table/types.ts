export type Primitive = string | number | boolean | null | undefined

export type DataRow = Record<string, Primitive>

export type ColumnDef<T extends DataRow = DataRow> = {
  id?: string
  accessorKey?: keyof T & string
  header?: string
  sortable?: boolean
  // cell recibe { row.original } para alinearse al patrón de shadcn
  cell?: (ctx: { row: { original: T } }) => React.ReactNode
}

export type DataTableMessages = {
  searchPlaceholder?: (fieldLabel: string) => string
  searchButton?: string
  clearButton?: string
  caption?: (page: number, totalPages: number, totalCount: number) => string
  empty?: string
  yes?: string
  no?: string
  fieldLabelFallback?: string
}