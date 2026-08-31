export type Primitive = string | number | boolean | null | undefined

export type DataRow = Record<string, Primitive>

export type ColumnDef<T extends DataRow = DataRow> = {
  id?: string
  accessorKey?: keyof T & string
  header?: string
  /**
   * El encabezado como NODO, para lo que no es texto: la casilla de
   * «seleccionar toda la página», un icono, una unidad.
   *
   * Gana a `header`, que se conserva porque sigue siendo la etiqueta del
   * selector de campo de búsqueda y del panel «Ver más» — ahí un nodo no vale.
   * Sin esto, una casilla en la cabecera es INEXPRESABLE: `TableView` solo
   * sabía pintar `col.header` como cadena.
   */
  headerCell?: () => React.ReactNode
  sortable?: boolean
  // false la excluye del selector de campo de búsqueda (default: buscable)
  searchable?: boolean
  // cell recibe { row.original } para alinearse al patrón de shadcn
  cell?: (ctx: { row: { original: T } }) => React.ReactNode
  // responsive hints
  minWidth?: number
  alwaysVisible?: boolean
  /**
   * Dónde se ancla la columna, pase lo que pase con el ancho.
   *
   * `useResponsiveColumns` REORDENA a `[...alwaysVisible, ...flexible, ...end]`,
   * así que la posición en el array no es la posición en pantalla: una casilla
   * puesta primera se pintaba DESPUÉS de la columna de nombre (que es
   * `alwaysVisible`) y a poco ancho se caía dentro del panel «Ver más», donde
   * una casilla es inservible. `pinned` es lo único que lo garantiza sin
   * depender de que quien llama acierte con `alwaysVisible`.
   *
   * `id === "actions"` se sigue tratando como `"end"` por compatibilidad: era el
   * único anclaje que existía y lo usan varias tablas.
   */
  pinned?: "start" | "end"
  /** Clases del `<th>`. Para anchos fijos: `w-10` en la columna de selección. */
  headClassName?: string
  /** Clases del `<td>`. */
  cellClassName?: string
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

export type DataTableResponsive<T extends DataRow = DataRow> = {
  minColumnWidth?: number
  primary?: Array<keyof T & string>
}

export type RowContextMenuRenderer<T extends DataRow = DataRow> = (ctx: { row: T }) => React.ReactNode