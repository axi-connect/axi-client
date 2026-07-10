"use client"

import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import type { ControllerRenderProps } from "react-hook-form";

// Props de input arbitrarias definidas por la config del campo; el tipo real
// depende del inputKind (input/textarea), por eso se modela como registro laxo.
type FieldInputProps = Record<string, unknown> & { id?: string; rows?: number; autoComplete?: string }

type RenderArgs = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RHF exige covarianza del TValues concreto del form
  field: ControllerRenderProps<any, string>
  placeholder?: string
  disabled?: boolean
  inputProps?: FieldInputProps
  invalid?: boolean
}

function InputFile(
  props: Omit<React.ComponentProps<typeof Input>, "onChange"> & { onChange: (file: File | null) => void; name?: string }
) {
  const { onChange, name, ...rest } = props
  return (
    <Input
      {...rest}
      type="file"
      onChange={(e) => {
        const files = (e.target as HTMLInputElement).files
        const file = files && files.length ? files[0] : null
        onChange(file)
        try {
          const objectUrl = file ? URL.createObjectURL(file) : undefined
          const detail = { name, file, objectUrl }
          window.dispatchEvent(new CustomEvent("dynamic-form:file:change", { detail }))
        } catch {}
      }}
    />
  )
}

export const components: Record<string, (args: RenderArgs) => React.ReactNode> = {
  file: ({ placeholder, disabled, field, invalid, inputProps }) => (
    <InputFile
      id={inputProps?.id}
      name={String(field.name)}
      placeholder={placeholder}
      disabled={disabled}
      aria-invalid={invalid}
      onChange={(file) => field.onChange(file)}
    />
  ),
  textarea: ({ field, placeholder, disabled, inputProps, invalid }) => (
    <Textarea
      {...field}
      rows={inputProps?.rows ?? 3}
      placeholder={placeholder}
      disabled={disabled}
      aria-invalid={invalid}
      {...inputProps}
    />
  ),
}

export function renderByInputKind(inputKind: string, args: RenderArgs): React.ReactNode {
  const renderer = components[inputKind]
  if (renderer) return renderer(args)

  return (
    <Input
      {...(args.field)}
      type={inputKind}
      disabled={args.disabled}
      aria-invalid={args.invalid}
      placeholder={args.placeholder}
      autoComplete={args.inputProps?.autoComplete}
      {...(args.inputProps)}
    />
  )
}