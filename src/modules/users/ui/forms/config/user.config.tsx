"use client"

import { z } from "zod"
import type { SelectOption } from "@/shared/api/query"
import type { CreateUserDTO, UpdateUserDTO } from "@/modules/users/domain/user"
import type { FieldConfig } from "@/shared/components/features/dynamic-form"
import { createCustomField, createInputField } from "@/shared/components/features/dynamic-form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"

/**
 * Config del formulario de usuario (create/edit) sobre el contrato nuevo:
 * `role_id` UUID, `avatar_url` como URL (el backend no acepta multipart)
 * y `status` editable solo en modo edición.
 */
export const userFormSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido"),
  email: z.email("Correo inválido").trim(),
  phone: z.string().trim().min(7, "Teléfono inválido").optional().or(z.literal("")),
  password: z.string().trim().min(8, "Mínimo 8 caracteres").optional().or(z.literal("")),
  role_id: z.string().min(1, "Selecciona el rol"),
  avatar_url: z.url("URL inválida").optional().or(z.literal("")),
  status: z.enum(["active", "disabled"]).optional(),
})

export type UserFormValues = z.infer<typeof userFormSchema>

export const defaultUserFormValues: UserFormValues = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role_id: "",
  avatar_url: "",
  status: undefined,
}

export function buildUserFormFields(opts?: {
  roles?: SelectOption[]
  formMode?: "create" | "edit"
}): ReadonlyArray<FieldConfig<UserFormValues>> {
  const roles = opts?.roles ?? []
  const isEdit = opts?.formMode === "edit"

  const fields: FieldConfig<UserFormValues>[] = [
    createInputField<UserFormValues>("name", { label: "Nombre completo", placeholder: "Mariana García", inputProps: { autoFocus: true }, autoComplete: "name" }),
    createInputField<UserFormValues>("email", { label: "Correo", inputKind: "email", placeholder: "mariana@example.com", autoComplete: "email", isDisabled: () => isEdit }),
    createInputField<UserFormValues>("phone", { label: "Teléfono", inputKind: "tel", placeholder: "3109876543", autoComplete: "tel" }),
    createInputField<UserFormValues>("password", {
      label: isEdit ? "Nueva contraseña (opcional)" : "Contraseña (opcional: sin ella queda invitado)",
      inputKind: "password",
      placeholder: "••••••••",
    }),
    createCustomField<UserFormValues>(
      "role_id",
      ({ value, setValue }) => (
        <Select name="role_id" value={String(value ?? "")} onValueChange={(v: string) => setValue("role_id", v)}>
          <SelectTrigger id="df-role_id">
            <SelectValue placeholder="Selecciona rol" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
      { label: "Rol", colSpan: { base: 1 }, htmlFor: "df-role_id" },
    ),
    createInputField<UserFormValues>("avatar_url", { label: "Avatar (URL)", placeholder: "https://…/avatar.png" }),
  ]

  if (isEdit) {
    fields.push(
      createCustomField<UserFormValues>(
        "status",
        ({ value, setValue }) => (
          <Select name="status" value={String(value ?? "active")} onValueChange={(v: string) => setValue("status", v as "active" | "disabled")}>
            <SelectTrigger id="df-status">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="disabled">Deshabilitado</SelectItem>
            </SelectContent>
          </Select>
        ),
        { label: "Estado", colSpan: { base: 1 }, htmlFor: "df-status" },
      ),
    )
  }

  return fields
}

export function toCreateUserDTO(values: UserFormValues): CreateUserDTO {
  return {
    name: values.name,
    email: values.email,
    role_id: values.role_id,
    ...(values.phone ? { phone: values.phone } : {}),
    ...(values.avatar_url ? { avatar_url: values.avatar_url } : {}),
    ...(values.password ? { password: values.password } : {}),
  }
}

export function toUpdateUserDTO(values: UserFormValues): UpdateUserDTO {
  return {
    name: values.name,
    phone: values.phone || null,
    avatar_url: values.avatar_url || null,
    role_id: values.role_id,
    ...(values.status ? { status: values.status } : {}),
    ...(values.password ? { password: values.password } : {}),
  }
}
