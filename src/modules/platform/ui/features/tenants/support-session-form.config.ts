import { z } from "zod";
import {
  SUPPORT_DEFAULT_MINUTES,
  SUPPORT_MAX_MINUTES,
  SUPPORT_MIN_MINUTES,
  SUPPORT_REASON_MIN,
  type IssueSupportSessionDTO,
} from "../../../domain/support-sessions";

/** «Entrar como soporte»: las mismas reglas del servidor, para avisar antes de enviar. */
export const supportSessionSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(SUPPORT_REASON_MIN, `Cuenta qué vas a revisar: al menos ${SUPPORT_REASON_MIN} caracteres`)
    .max(500, "Hasta 500 caracteres"),
  ticket_ref: z.string().trim().max(120, "Hasta 120 caracteres"),
  // El input numérico entrega texto: se valida como tal y se convierte al enviar.
  minutes: z
    .string()
    .trim()
    .refine((value) => {
      const minutes = Number(value);
      return /^\d+$/.test(value) && minutes >= SUPPORT_MIN_MINUTES && minutes <= SUPPORT_MAX_MINUTES;
    }, `De ${SUPPORT_MIN_MINUTES} a ${SUPPORT_MAX_MINUTES} minutos`),
  password: z.string().min(1, "Escribe tu contraseña de plataforma"),
});

export type SupportSessionFormValues = z.infer<typeof supportSessionSchema>;

export const defaultSupportSessionValues: SupportSessionFormValues = {
  reason: "",
  ticket_ref: "",
  minutes: String(SUPPORT_DEFAULT_MINUTES),
  password: "",
};

export function toIssueSupportSessionDTO(values: SupportSessionFormValues): IssueSupportSessionDTO {
  const parsed = supportSessionSchema.parse(values);
  return {
    reason: parsed.reason,
    minutes: Number(parsed.minutes),
    password: parsed.password,
    ...(parsed.ticket_ref ? { ticket_ref: parsed.ticket_ref } : {}),
  };
}
