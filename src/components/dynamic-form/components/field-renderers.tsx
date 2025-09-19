"use client"

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ControllerRenderProps } from "react-hook-form";

type RenderArgs = {
  field: ControllerRenderProps<any, string>
  placeholder?: string
  disabled?: boolean
  inputProps?: any
  invalid?: boolean
}

function InputFile(
  props: Omit<React.ComponentProps<typeof Input>, "onChange"> & { onChange: (file: File | null) => void }
) {
  const { onChange, ...rest } = props
  return (
    <Input
      {...rest}
      type="file"
      onChange={(e) => {
        const files = (e.target as HTMLInputElement).files
        onChange(files && files.length ? files[0] : null)
      }}
    />
  )
}

export const components: Record<string, (args: RenderArgs) => React.ReactNode> = {
  file: ({ placeholder, disabled, field, invalid }) => (
    <InputFile
      placeholder={placeholder}
      disabled={disabled}
      aria-invalid={invalid}
      onChange={(file) => field.onChange(file)}
    />
  ),
  textarea: ({ field, placeholder, disabled, inputProps, invalid }) => (
    <Textarea
      {...(field as any)}
      rows={(inputProps as any)?.rows ?? 3}
      placeholder={placeholder}
      disabled={disabled}
      aria-invalid={invalid}
      {...(inputProps as any)}
    />
  ),
}

export function renderByInputKind(inputKind: string, args: RenderArgs): React.ReactNode {
  const renderer = components[inputKind]
  if (renderer) return renderer(args)

  return (
    <Input
      {...(args.field as any)}
      type={inputKind as any}
      disabled={args.disabled}
      aria-invalid={args.invalid}
      placeholder={args.placeholder}
      autoComplete={args.inputProps?.autoComplete}
      {...(args.inputProps as any)}
    />
  )
}