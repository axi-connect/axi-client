"use client"

import { z } from "zod"
import type { SelectOption } from "@/shared/api/query"
import type { CreateUserDTO } from "@/modules/users/domain/user"
import type { FieldConfig } from "@/shared/components/features/dynamic-form"
import { createCustomField, createInputField } from "@/shared/components/features/dynamic-form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"

export const userFormSchema = z.object({
  email: z.email("Correo inválido").trim(),
  name: z.string().trim().min(1, "Nombre requerido"),
  phone: z.string().trim().min(7, "Teléfono inválido"),
  password: z.string().trim().min(8, "Mínimo 8 caracteres").optional(),
  company_id: z.coerce.number().int().positive("Selecciona la empresa"),
  role_id: z.coerce.number().int().positive("Selecciona el rol"),
  avatar: z.any().optional(),
})

export type UserFormValues = z.infer<typeof userFormSchema>

export const defaultUserFormValues: UserFormValues = {
  name: "",
  email: "",
  phone: "",
  password: "",
  company_id: 0 as unknown as number,
  role_id: 0 as unknown as number,
  avatar: undefined,
}

export function buildUserFormFields(opts?: { companies?: SelectOption[]; roles?: SelectOption[], formMode?: "create" | "edit" }): ReadonlyArray<FieldConfig<UserFormValues>> {
  const roles = opts?.roles ?? []
  const companies = opts?.companies ?? []
  return [
    createInputField<UserFormValues>("name", { label: "Nombre completo", placeholder: "Mariana García", inputProps: { autoFocus: true }, autoComplete: "name" }),
    createInputField<UserFormValues>("email", { label: "Correo", inputKind: "email", placeholder: "mariana@example.com", autoComplete: "email", isDisabled: () => opts?.formMode === "edit" }),
    createInputField<UserFormValues>("phone", { label: "Teléfono", inputKind: "tel", placeholder: "3109876543", autoComplete: "tel" }),
    createInputField<UserFormValues>("password", { label: "Contraseña", inputKind: "password", placeholder: "••••••••", isDisabled: () => opts?.formMode === "edit" }),
    createCustomField<UserFormValues>(
      "company_id",
      ({ value, setValue }) => {
        return (
          <Select name="company_id" value={String(value ?? "")} onValueChange={(v: string) => setValue("company_id", Number(v) as any)}>
            <SelectTrigger id="df-company_id">
              <SelectValue placeholder="Selecciona empresa" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      },
    { label: "Empresa", colSpan: { base: 1 }, htmlFor: "df-company_id" }),
    createCustomField<UserFormValues>(
      "role_id",
      ({ value, setValue }) => {
        return (
          <Select name="role_id" value={String(value ?? "")} onValueChange={(v: string) => setValue("role_id", Number(v) as any)}>
            <SelectTrigger id="df-role_id">
              <SelectValue placeholder="Selecciona rol" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      },
    { label: "Rol", colSpan: { base: 1 }, htmlFor: "df-role_id" }),
    createInputField<UserFormValues>("avatar", { label: "Avatar", inputKind: "file", htmlFor: "df-avatar", colSpan: { base: 2} }),
  ] as const
}

export function toCreateUserDTO(values: UserFormValues): CreateUserDTO {
  return {
    name: values.name,
    email: values.email,
    phone: values.phone,
    password: values.password || "",
    company_id: Number(values.company_id),
    role_id: Number(values.role_id),
    avatar: (values.avatar ?? undefined) as File | undefined,
  }
}