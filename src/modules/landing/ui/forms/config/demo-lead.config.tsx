"use client"

import { z } from "zod"
import {
  MONTHLY_CONVERSATION_RANGES,
  type DemoLeadPayload,
  type MonthlyConversationRange,
} from "@/modules/landing/domain/lead"

/**
 * Config del formulario "Agenda tu demo" (§11 de la landing).
 * 4 campos exactos del copy — ni uno más (landing-copy.md §11).
 */
export const demoLeadFormSchema = z.object({
  name: z.string().trim().min(2, "Cuéntanos tu nombre"),
  business_name: z.string().trim().min(2, "El nombre de tu negocio"),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+?[\d\s().-]{7,17}$/, "Escribe un número de WhatsApp válido"),
  monthly_conversations: z.enum(MONTHLY_CONVERSATION_RANGES),
})

export type DemoLeadFormValues = z.infer<typeof demoLeadFormSchema>

export const defaultDemoLeadFormValues: DemoLeadFormValues = {
  name: "",
  business_name: "",
  whatsapp: "",
  monthly_conversations: "lt_300",
}

/** Opciones del selector de volumen, en el orden del copy. */
export const MONTHLY_CONVERSATION_OPTIONS: ReadonlyArray<{
  value: MonthlyConversationRange
  label: string
}> = [
  { value: "lt_300", label: "Menos de 300" },
  { value: "300_1000", label: "300 a 1.000" },
  { value: "1000_3000", label: "1.000 a 3.000" },
  { value: "gt_3000", label: "Más de 3.000" },
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
