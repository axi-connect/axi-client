// types barrel only

import type { z } from "zod"
import { Button } from "@/components/ui/button"
import type { FieldPath, FieldValues, UseFormProps, Control } from "react-hook-form"

export type FormFieldName<TValues extends FieldValues> = FieldPath<TValues>

export type GridColumns =
  | number
  | {
      base?: number
      sm?: number
      md?: number
      lg?: number
      xl?: number
    }

export type GridColSpan = GridColumns

export type InputKind =
  | "text"
  | "email"
  | "password"
  | "number"
  | "date"
  | "datetime-local"
  | "time"
  | "url"
  | "tel"
  | "search"
  | "color"
  | "file"
  | "textarea"
  | "hidden"

export type BaseFieldConfig<TValues extends FieldValues> = {
  name: FormFieldName<TValues>
  label?: React.ReactNode
  description?: React.ReactNode
  placeholder?: string
  className?: string
  autoComplete?: string
  containerClassName?: string
  htmlFor?: string
  /**
   * Control de ancho del campo dentro de la grilla.
   * Acepta un número 1..12 o un objeto responsivo { base?, sm?, md?, lg?, xl? }.
   * Ej.: { base: 1, md: 2 } -> col-span-1 md:col-span-2
  */
  colSpan?: GridColSpan
  isVisible?: (values: TValues) => boolean
  isDisabled?: (values: TValues) => boolean
}

export type InputFieldConfig<TValues extends FieldValues> = BaseFieldConfig<TValues> & {
  component?: "input"
  inputKind?: InputKind
  inputProps?: (
    | Omit<React.ComponentProps<"input">, "name" | "onChange" | "value" | "defaultValue">
    | Omit<React.ComponentProps<"textarea">, "name" | "onChange" | "value" | "defaultValue">
  ) & {
    as?: React.ComponentType<any>
  }
}

export type CustomFieldRenderArgs<TValues extends FieldValues> = {
  name: FormFieldName<TValues>
  control: Control<TValues>
  value: unknown
  setValue: <Path extends FieldPath<TValues>>(name: Path, value: TValues[Path]) => void
  /** Obtiene el mensaje de error (si existe) para una subruta relativa, ej.: "0.day" */
  getError: (relativePath?: string) => string | undefined
  /** Indica si existe error para esa subruta */
  hasError: (relativePath?: string) => boolean
}

export type CustomFieldConfig<TValues extends FieldValues> = BaseFieldConfig<TValues> & {
  component: "custom"
  render: (args: CustomFieldRenderArgs<TValues>) => React.ReactNode
}

export type FieldConfig<TValues extends FieldValues> = InputFieldConfig<TValues> | CustomFieldConfig<TValues>

export type DynamicFormActions =
  | {
      submitLabel?: React.ReactNode
      submitIcon?: React.ReactNode
      submitVariant?: React.ComponentProps<typeof Button>["variant"]
      submitSize?: React.ComponentProps<typeof Button>["size"]
      showReset?: boolean
      resetLabel?: React.ReactNode
    }
  | {
      render: (ctx: { submitting: boolean; dirty: boolean; invalid: boolean }) => React.ReactNode
    }

export type DynamicFormProps<TValues extends FieldValues> = {
  id?: string
  schema: z.ZodType<TValues>
  defaultValues?: Partial<TValues>
  fields: ReadonlyArray<FieldConfig<TValues>>
  onSubmit?: (values: TValues) => void | Promise<void>
  mode?: UseFormProps<TValues>["mode"]
  columns?: GridColumns
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  className?: string
  renderFieldsWrapper?: (children: React.ReactNode) => React.ReactNode
  actions?: DynamicFormActions
}