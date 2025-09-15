import type { FieldValues } from "react-hook-form"
import type { CustomFieldConfig, FieldConfig, FormFieldName, InputFieldConfig } from "./types"

export function createField<TValues extends FieldValues>(config: FieldConfig<TValues>): FieldConfig<TValues> {
  return config
}

export function createInputField<TValues extends FieldValues>(
  name: FormFieldName<TValues>,
  options?: Omit<InputFieldConfig<TValues>, "name">
): InputFieldConfig<TValues> {
  return { component: "input", inputKind: "text", name, ...options }
}

export function createCustomField<TValues extends FieldValues>(
  name: FormFieldName<TValues>,
  render: CustomFieldConfig<TValues>["render"],
  options?: Omit<CustomFieldConfig<TValues>, "name" | "render" | "component">
): CustomFieldConfig<TValues> {
  return { component: "custom", name, render, ...options }
}