/**
 * Paso «Cuenta» de `/comenzar`: la persona propietaria. Sin confirmación de
 * contraseña (se muestra con el ojo, que es la confirmación que no se olvida) y
 * con medidor de fortaleza. Los términos son una casilla nativa (`Checkbox`)
 * con enlaces a los textos legales: Ley 1581 obliga a dejar rastro del
 * consentimiento, y el backend guarda fecha e IP.
 */
import Link from "next/link";
import { z } from "zod";

import { Checkbox } from "@/shared/components/ui/checkbox";
import { createCustomField, createInputField, type FieldConfig } from "@/shared/components/features/dynamic-form";
import type { AccountDraft } from "@/modules/onboarding/domain/signup-draft";
import { PasswordField } from "@/modules/onboarding/ui/signup/PasswordField";

const PASSWORD_INPUT_ID = "signup-password";

export const accountStepSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre"),
  email: z.string().trim().email("Escribe un correo válido"),
  password: z
    .string()
    .min(10, "Mínimo 10 caracteres")
    .regex(/[A-Z]/, "Incluye al menos una mayúscula")
    .regex(/\d/, "Incluye al menos un número"),
  accept_terms: z.boolean().refine((value) => value, {
    message: "Acepta los términos para crear tu cuenta",
  }),
});

export type AccountStepValues = z.infer<typeof accountStepSchema>;

export const defaultAccountStepValues: AccountStepValues = {
  name: "",
  email: "",
  password: "",
  accept_terms: false,
};

export function accountDraftToValues(draft: AccountDraft | null): AccountStepValues {
  // La contraseña nunca vuelve del borrador persistido; sí del borrador en memoria.
  return draft ? { ...defaultAccountStepValues, ...draft } : defaultAccountStepValues;
}

export function buildAccountFields(): FieldConfig<AccountStepValues>[] {
  return [
    createInputField<AccountStepValues>("name", {
      label: "Tu nombre",
      placeholder: "Nombre y apellido",
      autoComplete: "name",
    }),
    createInputField<AccountStepValues>("email", {
      label: "Correo de trabajo",
      inputKind: "email",
      placeholder: "nombre@empresa.com",
      autoComplete: "email",
      description: "Te enviaremos un enlace para verificarlo. Puedes seguir configurando mientras tanto.",
    }),
    createCustomField<AccountStepValues>(
      "password",
      ({ value, setValue, getError }) => (
        <PasswordField
          id={PASSWORD_INPUT_ID}
          value={typeof value === "string" ? value : ""}
          onChange={(next) => setValue("password", next)}
          error={getError()}
        />
      ),
      // `htmlFor`: la etiqueta la pinta DynamicForm y el input vive en el
      // componente custom; sin el enlace, el lector de pantalla no los une.
      { label: "Contraseña", htmlFor: PASSWORD_INPUT_ID, colSpan: { base: 1, md: 2 } },
    ),
    createCustomField<AccountStepValues>(
      "accept_terms",
      ({ value, setValue, getError }) => (
        <div className="space-y-1">
          <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-relaxed">
            <Checkbox
              checked={value === true}
              onChange={(event) => setValue("accept_terms", event.target.checked)}
              className="mt-0.5"
            />
            <span>
              Acepto los{" "}
              <Link href="/legal/terminos" className="text-brand underline underline-offset-3" target="_blank">
                Términos del servicio
              </Link>{" "}
              y la{" "}
              <Link href="/legal/privacidad" className="text-brand underline underline-offset-3" target="_blank">
                Política de privacidad
              </Link>
              . Tus datos se tratan según la Ley 1581 de 2012.
            </span>
          </label>
          {getError() && (
            <p role="alert" className="text-destructive text-sm">
              {getError()}
            </p>
          )}
        </div>
      ),
      { colSpan: { base: 1, md: 2 } },
    ),
  ];
}
