"use client"

import { cn } from "@/lib/utils"
import { useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Form as RHFFormProvider } from "@/components/ui/form"
import { DefaultValues, useForm, type FieldValues } from "react-hook-form"

import { DynamicCustomField, DynamicInputField } from "./components/dynamic-form.fields";
import type { DynamicFormProps, FieldConfig, CustomFieldConfig, InputFieldConfig } from "./types";
import { GAP_CLASS_BY_LEVEL, columnsToClasses, createZodResolver } from "./utils/dynamic-form.helpers";

export function DynamicForm<TValues extends FieldValues>(props: DynamicFormProps<TValues>) {
  const {
    id,
    schema,
    defaultValues,
    fields,
    onSubmit,
    mode = "onSubmit",
    columns = { base: 1, md: 2 },
    gap = 4,
    className,
    renderFieldsWrapper,
    actions,
  } = props

  const form = useForm<TValues>({
    resolver: createZodResolver(schema),
    defaultValues: defaultValues as DefaultValues<TValues>,
    mode,
  })

  const { handleSubmit, formState } = form

  const onValid = useCallback(
    async (data: TValues) => {
      if (!onSubmit) return
      await onSubmit(data)
    },
    [onSubmit]
  )

  const gridClasses = useMemo(() => {
    const gapClass = GAP_CLASS_BY_LEVEL[gap] ?? GAP_CLASS_BY_LEVEL[4]
    return cn("grid", columnsToClasses(columns), gapClass)
  }, [columns, gap])

  const renderField = useCallback(
    (f: FieldConfig<TValues>) => {
      if ((f as CustomFieldConfig<TValues>).component === "custom") {
        return (
          <DynamicCustomField<TValues>
            key={String((f as CustomFieldConfig<TValues>).name)}
            config={f as CustomFieldConfig<TValues>}
          />
        )
      }
      return (
        <DynamicInputField<TValues>
          key={String((f as InputFieldConfig<TValues>).name)}
          config={f as InputFieldConfig<TValues>}
        />
      )
    },
    []
  )

  const fieldsGrid = useMemo(() => {
    const children: React.ReactNode[] = []
    fields.forEach((f) => {
      children.push(renderField(f))
    })
    const content = <div className={gridClasses}>{children}</div>
    return renderFieldsWrapper ? (renderFieldsWrapper(content) as React.ReactElement) : content
  }, [fields, gridClasses, renderField, renderFieldsWrapper])

  const renderActions = () => {
    const submitting = formState.isSubmitting
    const dirty = formState.isDirty
    const invalid = !formState.isValid
    if (!actions) return null
    if ("render" in actions) return <div className="flex items-center gap-2">{actions.render({ submitting, dirty, invalid })}</div>
    const { submitLabel = "Guardar", submitIcon, submitVariant = "default", submitSize = "default", showReset = false, resetLabel = "Restablecer" } = actions || {}
    return (
      <div className="flex flex-wrap items-center gap-2">
        {showReset && dirty ? (
          <Button type="reset" variant="outline">
            {resetLabel}
          </Button>
        ) : null}
        <Button type="submit" variant={submitVariant} size={submitSize} disabled={submitting || invalid}>
          {submitIcon}
          {submitLabel}
        </Button>
      </div>
    )
  }

  return (
    <RHFFormProvider {...form}>
      <form
        id={id}
        onSubmit={handleSubmit(onValid)}
        onReset={(e) => {
          e.preventDefault()
          form.reset()
        }}
        className={cn("flex flex-col gap-6", className)}
      >
        {fieldsGrid}
        {renderActions()}
      </form>
    </RHFFormProvider>
  )
}