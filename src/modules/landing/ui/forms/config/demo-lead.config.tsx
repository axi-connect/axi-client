"use client"

import { z } from "zod"
import {
  MONTHLY_CONVERSATION_RANGES,
  type DemoLeadPayload,
  type MonthlyConversationRange,
} from "@/modules/landing/domain/lead"

/**
 * Config del formulario "Agenda tu demo" (§11 de la landing).
 * Los 4 campos del copy más la casilla de tratamiento de datos, que no es
 * copy sino requisito legal desde que el envío se persiste.
 */
export const demoLeadFormSchema = z.object({
  name: z.string().trim().min(2, "Cuéntanos tu nombre"),
  business_name: z.string().trim().min(2, "El nombre de tu negocio"),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+?[\d\s().-]{7,17}$/, "Escribe un número de WhatsApp válido"),
  monthly_conversations: z.enum(MONTHLY_CONVERSATION_RANGES),
  /**
   * Tratamiento de datos. Obligatoria en Colombia por la ley 1581, y el
   * backend rechaza el envío sin ella: desde que el formulario PERSISTE, pedir
   * el dato sin autorización deja de ser defendible.
   */
  consent: z.literal(true, { message: "Necesitamos tu autorización para escribirte" }),
})

export type DemoLeadFormValues = z.infer<typeof demoLeadFormSchema>

export const defaultDemoLeadFormValues: DemoLeadFormValues = {
  name: "",
  business_name: "",
  whatsapp: "",
  monthly_conversations: "lt_500",
  // Sin marcar: un consentimiento premarcado no es consentimiento.
  consent: false as unknown as true,
}

/** Opciones del selector de volumen, en el orden del copy. */
export const MONTHLY_CONVERSATION_OPTIONS: ReadonlyArray<{
  value: MonthlyConversationRange
  label: string
}> = [
  { value: "lt_500", label: "Menos de 500" },
  { value: "500_1500", label: "500 a 1.500" },
  { value: "1500_4000", label: "1.500 a 4.000" },
  { value: "gt_4000", label: "Más de 4.000" },
  { value: "unknown", label: "No lo sé" },
]

export function monthlyConversationLabel(value: MonthlyConversationRange): string {
  return MONTHLY_CONVERSATION_OPTIONS.find((option) => option.value === value)?.label ?? value
}

export function toDemoLeadPayload(values: DemoLeadFormValues): DemoLeadPayload {
  return {
    name: values.name,
    business_name: values.business_name,
    whatsapp: values.whatsapp,
    monthly_conversations: values.monthly_conversations,
  }
}
