# DynamicForm (Axi Connect)

Componente de formulario dinámico, altamente tipado, basado en React Hook Form + Zod + Tailwind + shadcn/ui. Diseñado para ser reutilizable, performante y fácil de extender.

## Características Clave
- Tipado fuerte con Zod y generics de React Hook Form.
- Configuración declarativa por objeto (schema + fields).
- Render granular por campo con `useWatch` local (mejor rendimiento).
- Personalización con React nodes a nivel de campo (renderers "custom").
- Layout responsive con grillas seguras para Tailwind (clases fijas descubribles en build).
- Acciones flexibles (submit/reset o render totalmente custom).
- Manejo seguro de inputs tipo `file`.

## Estructura de Archivos
```
src/components/dynamic-form/
  ├─ dynamic-form.tsx            # Componente principal
  ├─ dynamic-form.builders.ts    # Builders de campos
  ├─ components/
  │   └─ dynamic-form.fields.tsx # Renderers de campos (input/custom) y wrapper
  ├─ types/
  │   └─ index.ts                # Definiciones de tipos
  ├─ utils/
  │   └─ dynamic-form.helpers.ts # Helpers (grid/gap, zod resolver tipado)
  └─ index.ts                    # Barrel de exportaciones
```

## Dependencias Requeridas
- react-hook-form
- zod y @hookform/resolvers
- tailwindcss y shadcn/ui

## API
### Componente principal
```tsx
import { DynamicForm } from "@/components/dynamic-form"
```

Props (`DynamicFormProps<TValues>`):
- `schema: z.ZodType<TValues>`: esquema que tipa el formulario.
- `defaultValues?: Partial<TValues>`: valores iniciales.
- `fields: ReadonlyArray<FieldConfig<TValues>>`: configuración de campos.
- `onSubmit?: (values: TValues) => void | Promise<void>`: handler de envío.
- `mode?: UseFormProps<TValues>["mode"]`: modo de RHF (default `onSubmit`).
- `columns?: GridColumns`: columnas responsivas: número o `{ base, sm, md, lg, xl }`.
- `gap?: 1|2|3|4|5|6|7|8`: separación entre campos (clases seguras `gap-*`).
- `className?: string`: clases extra del `<form>`.
- `renderFieldsWrapper?: (children) => React.ReactNode`: wrapper opcional para la grilla.
- `actions?: DynamicFormActions`: acciones por defecto o render custom de acciones.

### Tipos de campos
```ts
type FieldConfig<TValues> = InputFieldConfig<TValues> | CustomFieldConfig<TValues>
```

- `InputFieldConfig<TValues>`:
  - `component?: "input"` (por defecto).
  - `name`: nombre del campo tipado.
  - `label?`, `description?`, `placeholder?`, `className?`, `containerClassName?`.
  - `colSpan?`: controla el ancho del campo en la grilla. Acepta:
    - Número 1..12: `col-span-N`
    - Objeto responsivo `{ base?, sm?, md?, lg?, xl? }`: ejemplo `{ base: 1, md: 2 }` → `col-span-1 md:col-span-2`
  - `inputKind?`: "text" | "email" | "password" | "number" | "date" | "datetime-local" | "time" | "url" | "tel" | "search" | "color" | "file" | "hidden".
  - `inputProps?`: props nativas de `<input>` y `as?: React.ComponentType<HTMLInputProps>` para reemplazo.
  - `isVisible?(values)`, `isDisabled?(values)`: lógica condicional por valores actuales.

- `CustomFieldConfig<TValues>`:
  - `component: "custom"`.
  - `render({ name, control, value, setValue }) => ReactNode`.
  - `colSpan?`: mismo comportamiento que en `InputFieldConfig` (ancho en la grilla).
  - Misma metadata opcional y condicionales.

### Builders
```ts
import { createField, createInputField, createCustomField } from "@/components/dynamic-form"
```
- `createInputField(name, options)`
- `createCustomField(name, render, options)`
- `createField(config)`

## Ejemplo Básico
```tsx
import { DynamicForm, createInputField, createCustomField } from "@/components/dynamic-form"
import { z } from "zod"

type Values = {
  firstName: string
  email: string
  age?: number
  avatar?: File | null
}

const schema = z.object({
  firstName: z.string().min(1, "Requerido"),
  email: z.string().email("Correo inválido"),
  age: z.coerce.number().int().positive().optional(),
  avatar: z.any().optional(),
})

const fields = [
  createInputField<Values>("firstName", { label: "Nombre", placeholder: "Tu nombre" }),
  createInputField<Values>("email", { inputKind: "email", label: "Correo" }),
  createInputField<Values>("age", { inputKind: "number", label: "Edad", isVisible: v => !!v.email }),
  createInputField<Values>("avatar", { inputKind: "file", label: "Avatar" }),
  createCustomField<Values>(
    "firstName",
    ({ value }) => <div className="text-xs text-muted-foreground">Valor actual: {String(value ?? "")}</div>,
    { label: "Preview (custom)" }
  ),
] as const

export default function Ejemplo() {
  return (
    <DynamicForm<Values>
      schema={schema}
      defaultValues={{ firstName: "", email: "" }}
      fields={fields}
      columns={{ base: 1, md: 2 }}
      gap={4}
      actions={{ submitLabel: "Guardar", showReset: true }}
      onSubmit={async (data) => {
        console.log("submit", data)
      }}
    />
  )
}
```

## Buenas Prácticas
- SRP: cada archivo tiene un propósito claro (tipos, helpers, campos, builders, componente).
- Re-render mínimo: `useWatch` sólo a nivel de campo.
- Tailwind seguro: clases predefinidas `grid-cols-*` y `gap-*` para que el build las detecte.
- Accesibilidad: wrappers de shadcn (`FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`).
- Reset UX: mostrar reset sólo cuando el formulario está modificado (`isDirty`).

## Extensión
- Nuevos tipos de campos: crea un renderer similar a `DynamicInputField` y añade un discriminante `component`.
- Integración con otros inputs (Select/Textarea/Checkbox/Switch/DatePicker): usa `inputProps.as` o un renderer dedicado.
- Kits por dominio: factories que empaqueten `schema + fields` (ej. `buildCompanyForm()`).

## Helpers Disponibles
```ts
import { columnsToClasses, GAP_CLASS_BY_LEVEL, GRID_COLS_CLASS_BY_COUNT, createZodResolver } from "@/components/dynamic-form"
```

## Notas de Performance
- Evita lógica pesada dentro de los renderers; memoiza donde aplique.
- Prefiere `inputProps.as` para inputs complejos.

## Licencia
Uso interno en Axi Connect.
