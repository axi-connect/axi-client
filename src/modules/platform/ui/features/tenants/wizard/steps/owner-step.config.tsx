/**
 * Paso «Propietario»: Zod + campos para `DynamicForm`. La contraseña es un
 * campo custom con generador criptográfico, copiar y toggle de visibilidad —
 * se muestra UNA sola vez (el backend jamás la devuelve).
 */
import { z } from "zod";
import { createInputField } from "@/shared/components/features/dynamic-form";
import type { FieldConfig } from "@/shared/components/features/dynamic-form";

export const ownerStepSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Correo inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export type OwnerStepValues = z.infer<typeof ownerStepSchema>;

export const defaultOwnerStepValues: OwnerStepValues = { name: "", email: "", password: "" };

/** Contraseña aleatoria robusta (16 chars, clases mezcladas, sin ambiguos). */
export function generatePassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!$%&*+-_?";
  const bytes = new Uint32Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((n) => alphabet[n % alphabet.length]).join("");
}

/** Los dos campos simples; el de contraseña lo aporta `OwnerStep` (custom). */
export function buildOwnerBaseFields(): FieldConfig<OwnerStepValues>[] {
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
    }),
  ];
}
