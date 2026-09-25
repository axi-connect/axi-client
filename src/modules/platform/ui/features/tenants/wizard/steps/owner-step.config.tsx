/**
 * Paso «Propietario»: Zod + campos para `DynamicForm`. Solo nombre y correo:
 * el dueño crea su propia contraseña con el enlace de la bienvenida (E1) y
 * nadie más la conoce. El servidor lo deja `invited` hasta entonces.
 */
import { z } from "zod";
import { createInputField } from "@/shared/components/features/dynamic-form";
import type { FieldConfig } from "@/shared/components/features/dynamic-form";
import type { CreateTenantDTO } from "../../../../../domain/tenant";

export const ownerStepSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres"),
  email: z.string().trim().email("Correo inválido"),
});

export type OwnerStepValues = z.infer<typeof ownerStepSchema>;

export const defaultOwnerStepValues: OwnerStepValues = { name: "", email: "" };

/** El `owner` del alta, sin contraseña (el contrato la admite opcional; aquí nunca viaja). */
export function toOwnerPayload(values: OwnerStepValues): CreateTenantDTO["owner"] {
  return { name: values.name.trim(), email: values.email.trim() };
}

export function buildOwnerFields(): FieldConfig<OwnerStepValues>[] {
  return [
    createInputField<OwnerStepValues>("name", {
      label: "Nombre *",
      placeholder: "Ana Ruiz",
      autoComplete: "off",
    }),
    createInputField<OwnerStepValues>("email", {
      label: "Email *",
      inputKind: "email",
      placeholder: "ana@empresa.co",
      autoComplete: "off",
      description: "Aquí le llega la bienvenida, con el enlace para crear su contraseña.",
    }),
  ];
}
