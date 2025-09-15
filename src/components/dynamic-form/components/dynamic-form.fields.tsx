"use client"

import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { renderByInputKind } from "./field-renderers";
import { colSpanToClasses } from "../utils/dynamic-form.helpers";
import type { CustomFieldConfig, InputFieldConfig } from "../types";
import { useWatch, useFormContext, type FieldPath, type FieldValues } from "react-hook-form";
import { FormItem, FormLabel, FormControl, FormDescription, FormMessage, FormField } from "@/components/ui/form"

type FieldWrapperProps = {
  htmlFor?: string
  hidden?: boolean
  label?: React.ReactNode
  fieldClassName?: string
  children: React.ReactNode
  containerClassName?: string
  description?: React.ReactNode
}

export function DynamicFormFieldWrapper({
  label,
  hidden,
  htmlFor,
  children,
  description,
  fieldClassName,
  containerClassName,
}: FieldWrapperProps) {
  return (
    <FormItem className={cn("w-full min-w-0", containerClassName, hidden && "hidden")}>
      {label ? <FormLabel htmlFor={htmlFor}>{label}</FormLabel> : null}
      <FormControl>
        <Slot className={cn("min-w-0", fieldClassName)}>{children}</Slot>
      </FormControl>
      {description ? <FormDescription>{description}</FormDescription> : null}
      <FormMessage />
    </FormItem>
  )
}

export function DynamicInputField<TValues extends FieldValues>({ config }: { config: InputFieldConfig<TValues> }) {
  const { control } = useFormContext<TValues>()
  const values = useWatch({ control }) as TValues
  const {
    name,
    label,
    description,
    placeholder,
    inputKind = "text",
    inputProps,
    className: fieldClass,
    containerClassName,
    colSpan,
    isVisible,
    isDisabled,
  } = config

  const visible = isVisible ? !!isVisible(values) : true
  if (!visible) return null
  const disabled = isDisabled ? !!isDisabled(values) : false
  const hidden = inputKind === "hidden"
  const safeId = `df-${String(name).replace(/[^a-zA-Z0-9_-]/g, '-')}`

  return (
    <FormField<TValues, any>
      control={control}
      name={name as FieldPath<TValues>}
      render={({ field, fieldState }) => (
        <DynamicFormFieldWrapper
          label={label}
          hidden={hidden}
          htmlFor={safeId}
          description={description}
          fieldClassName={fieldClass}
          containerClassName={cn(containerClassName, colSpanToClasses(colSpan))}
        >
          {renderByInputKind(inputKind, {
            field,
            placeholder,
            disabled,
            inputProps: { id: safeId, ...(inputProps as any) },
            invalid: !!fieldState.error,
          })}
        </DynamicFormFieldWrapper>
      )}
    />
  )
}

export function DynamicCustomField<TValues extends FieldValues>({ config }: { config: CustomFieldConfig<TValues> }) {
  const { control, setValue } = useFormContext<TValues>()
  const values = useWatch({ control }) as TValues
  const { name, label, description, className: fieldClass, containerClassName, render, isVisible, isDisabled, colSpan, htmlFor } = config
  const visible = isVisible ? !!isVisible(values) : true
  if (!visible) return null
  const disabled = isDisabled ? !!isDisabled(values) : false
  const safeId = `df-${String(name).replace(/[^a-zA-Z0-9_-]/g, '-')}`

  return (
    <FormField<TValues, any>
      control={control}
      name={name as FieldPath<TValues>}
      render={({ formState }) => (
        
        <DynamicFormFieldWrapper
          label={label}
          description={description}
          htmlFor={htmlFor ?? safeId}
          containerClassName={cn(containerClassName, colSpanToClasses(colSpan))}
          fieldClassName={fieldClass}
        >
          <div aria-disabled={disabled}>
            {render({
              name,
              control,
              value: (values as any)?.[name as any],
              setValue: setValue as any,
              getError: (relativePath?: string) => {
                const fullPath = relativePath ? `${String(name)}.${relativePath}` : String(name)
                const getByPath = (obj: any, path: string) =>
                  path.split('.').reduce((acc: any, part: string) => (acc == null ? acc : acc[part]), obj)
                const node = getByPath(formState.errors as any, fullPath)
                if (!node) return undefined
                if (typeof node === 'object' && 'message' in node) return String((node as any).message ?? '')
                return typeof node === 'string' ? node : undefined
              },
              hasError: (relativePath?: string) => {
                const fullPath = relativePath ? `${String(name)}.${relativePath}` : String(name)
                const getByPath = (obj: any, path: string) =>
                  path.split('.').reduce((acc: any, part: string) => (acc == null ? acc : acc[part]), obj)
                return Boolean(getByPath(formState.errors as any, fullPath))
              },
            })}
          </div>
        </DynamicFormFieldWrapper>
      )}
    />
  )
}