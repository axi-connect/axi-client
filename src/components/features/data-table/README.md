# DataTable (responsive, colapsable, tipado)

Tabla flexible y lista para producción construida con React, TypeScript, TailwindCSS, shadcn/ui y Framer Motion. Soporta comportamiento responsive con colapso automático de columnas en pantallas pequeñas, detalles por fila con animación, paginación/ordenamiento (cliente/servidor), búsqueda con debounce o submit e i18n.

## Características

- Columnas responsive con colapso automático según el ancho disponible (ResizeObserver)
- Detalles por fila colapsables con animaciones suaves (Framer Motion)
- Tipado fuerte con genéricos (`ColumnDef<T>`) para llaves seguras y autocompletado
- Arquitectura modular y limpia: hooks + subcomponentes
- Accesible de base (atributos ARIA, anuncios `aria-live`)
- Theming con tokens globales (estilo Tailwind v4)

---

## Estructura de archivos

```
src/components/ui/data-table/
  - index.tsx          // Componente principal (superficie de API)
  - TableView.tsx      // Render de encabezado/cuerpo con columnas responsive
  - Row.tsx            // Fila (celdas visibles + colapso opcional)
  - RowCollapse.tsx    // Colapso animado (Framer Motion) con lista etiqueta → valor
  - hooks.ts           // useResponsiveColumns, useRowCollapse, useDebouncedCallback, useControlled, useSearchableFields
  - helpers.ts         // formatCell, ariaSortFrom, pad2
  - types.ts           // Primitive, DataRow, ColumnDef<T>, DataTableMessages, DataTableResponsive
  - README.md          // Esta documentación
```

---

## Inicio rápido

```tsx
import DataTable, { type ColumnDef } from "@/components/features/data-table"

// 1) Define tu tipo de fila
interface CompanyRow {
  id: string
  name: string
  nit: string
  city: string
  industry: string
}

// 2) Define columnas (tipadas)
const columns: ColumnDef<CompanyRow>[] = [
  { accessorKey: "name", header: "Empresa", sortable: true, minWidth: 220 },
  { accessorKey: "nit", header: "NIT", sortable: true, minWidth: 160 },
  { accessorKey: "city", header: "Ciudad", sortable: true, minWidth: 160 },
  { accessorKey: "industry", header: "Industria", sortable: true, minWidth: 200 },
  { id: "actions", alwaysVisible: true, cell: ({ row }) => <Acciones id={row.original.id} /> },
]

// 3) Renderiza la tabla
<DataTable
  data={rows}
  columns={columns}
  pagination={{ page, pageSize: 10, total }}
  sorting={{ by: sortBy, dir: sortDir }}
  search={{ field: searchField, value: searchValue }}
  searchTrigger="submit"
  onPageChange={(p) => { setPage(p); fetch(p) }}
  onSortChange={(by, dir) => { setSortBy(by); setSortDir(dir); fetch(1, by, dir) }}
  onSearchChange={({ field, value }) => { setSearchField(field); setSearchValue(value); fetch(1, undefined, undefined, field, value) }}
/>
```

---

## API de Props

```ts
export type DataTableProps<T extends DataRow = DataRow> = {
  // datos
  data: T[]
  columns: ColumnDef<T>[]

  // meta agrupada
  pagination?: { page: number; pageSize: number; total?: number }
  sorting?: { by: keyof T & string; dir?: "asc" | "desc" }
  search?: { field?: keyof T & string; value?: string }

  // manejadores
  onPageChange?: (page: number) => void
  onSortChange?: (by: keyof T & string, dir: "asc" | "desc") => void
  onSearchChange?: (payload: { field: keyof T & string; value: string }) => void

  // búsqueda
  searchDebounceMs?: number // por defecto: 350
  searchTrigger?: "debounced" | "submit" // por defecto: "debounced"

  // i18n
  messages?: DataTableMessages

  // orden preferido de campos para búsqueda (opcional)
  preferredSearchFields?: Array<keyof T & string>
}
```

Valores por defecto:
- `pagination.pageSize` = 10
- `sorting.dir` = "asc"
- `searchTrigger` = "debounced"
- Si `search.field` no se pasa, toma la primera columna con `accessorKey`
- Si `pagination.total` no se pasa, se asume paginación en cliente con `data.length`

---

## Columnas (tipadas)

```ts
export type ColumnDef<T extends DataRow = DataRow> = {
  id?: string
  accessorKey?: keyof T & string
  header?: string
  sortable?: boolean
  cell?: (ctx: { row: { original: T } }) => React.ReactNode
  // Pistas responsive
  minWidth?: number       // px, usado por el algoritmo responsive
  alwaysVisible?: boolean // nunca se colapsa (p.ej., columna de acciones)
}
```

- `accessorKey` está tipado contra `T` para evitar typos y facilitar autocompletado.
- `cell` recibe `{ row: { original } }` (patrón de shadcn/ui).
- `minWidth` por columna mejora el cálculo responsive (default 160px).
- `alwaysVisible` fuerza la visibilidad (útil para acciones).

---

## Mensajes (i18n)

```ts
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
```

Por defecto (es):
- `searchPlaceholder`: `Buscar por ${label}...`
- `searchButton`: `Buscar`
- `clearButton`: `Limpiar`
- `caption`: `Página ${p} de ${tp} — ${tc} registros`
- `empty`: `Sin resultados`
- `yes`: `Sí`, `no`: `No`
- `fieldLabelFallback`: `campo`

Ejemplo (en):
```tsx
<DataTable
  data={rows}
  columns={columns}
  messages={{
    searchPlaceholder: (label) => `Search by ${label}...`,
    searchButton: "Search",
    clearButton: "Clear",
    caption: (p, tp, tc) => `Page ${p} of ${tp} — ${tc} records`,
    empty: "No results found",
    yes: "Yes",
    no: "No",
    fieldLabelFallback: "field",
  }}
/>
```

---

## Comportamiento responsive

- Implementado con `ResizeObserver` en `useResponsiveColumns`.
- El hook mide el ancho del contenedor y estima cuántas columnas caben según `minWidth` (o 160px por defecto).
- Se renderizan en la fila principal todas las `alwaysVisible` + las primeras columnas flexibles que entren; el resto van a un panel colapsable por fila.
- No hay nombres de columnas hardcodeados; el comportamiento se adapta a las columnas actuales y al ancho real.

Integración de `minWidth`:
```tsx
const columns: ColumnDef<User>[] = [
  { accessorKey: "name", header: "Nombre", minWidth: 220 },
  { accessorKey: "email", header: "Correo", minWidth: 260 },
  { accessorKey: "role", header: "Rol", minWidth: 160 },
]
```

---

## Subcomponentes

- `SearchBar`: Input + limpiar + submit (cuando `searchTrigger="submit"`), dropdown de campos. Accesible y consistente.
- `TableView`: Encabezado y cuerpo. Usa `useResponsiveColumns` y delega filas a `DataTableRow`.
- `DataTableRow`: Renderiza celdas visibles y, si hay colapsadas, un `RowCollapse`.
- `RowCollapse`: Panel animado (Framer Motion `AnimatePresence`/`motion.div`) con lista etiqueta → valor. Usa tokens globales y bordes suaves.

---

## Hooks

- `useResponsiveColumns(columns, containerRef, { minColumnWidth })`
  - Devuelve `{ visibleColumns, collapsedColumns }` según el ancho medido.
- `useRowCollapse(initialOpen)`
  - Devuelve `{ open, toggle, close }` para manejar el estado del colapso por fila.
- `useDebouncedCallback(fn, delayMs, enabled)`
  - Debounce genérico para búsqueda/llamadas.
- `useControlled(value, fallback)`
  - Sincroniza estado controlado/no controlado.
- `useSearchableFields(columns, preferred)`
  - Construye la lista de campos buscables desde las columnas (con orden preferido opcional).

---

## Accesibilidad

- `TableCaption` usa `aria-live="polite"` para anunciar cambios de paginación.
- Colapso por fila con `aria-expanded` y `aria-controls`.
- Botones con etiquetas accesibles (Search, Clear) y soporte de teclado.

---

## Temas y estilos

- Tokens globales (`--color-accent`, `--color-border`, etc.).
- Bordes suaves en filas/encabezados con `border-border-soft` (definida en `globals.css`).
- Componentes shadcn/ui para consistencia visual.

---

## Rendimiento

- `React.memo` en filas y colapso para evitar renders innecesarios.
- `useMemo`, `useCallback` en colecciones y handlers.
- Debounce configurable para búsqueda.

---

## Migración (props antiguas → nuevas)

- `page`, `pageSize`, `total` → `pagination: { page, pageSize, total }`
- `sortBy`, `sortDir` → `sorting: { by, dir }`
- `searchField`, `searchValue` → `search: { field, value }`
- Callbacks (`onPageChange`, `onSortChange`, `onSearchChange`) se mantienen.

---

## Notas conocidas

- Para evitar hydration mismatches, el cálculo responsive se hace en cliente con `ResizeObserver`. SSR renderiza todas las columnas; en el primer frame de cliente se ajusta al ancho real.
- Si quieres reducir el pequeño salto visual en mobile al montar, podrías predecir las columnas visibles con CSS/medias, pero la solución actual prioriza exactitud sin comprometer SSR.

---