import type { Schemas } from "@/core/api/types"

/**
 * «Escribirles» (Fase B2, mockup aprobado `outreach-from-search`): de una
 * búsqueda a la secuencia con UNA imagen para el WhatsApp y el correo.
 */
export type SearchOutreachSummaryDTO = Schemas["SearchOutreachSummaryDto"]
export type SearchOutreachResultDTO = Schemas["SearchOutreachResultDto"]
export type SequenceLookViewDTO = Schemas["SequenceLookViewDto"]
export type OutreachImageDTO = Schemas["OutreachImageDto"]
export type EmailPreviewDTO = Schemas["EmailPreviewDto"]

export type EmailDesign = "text" | "brand"
export type CtaTarget = "reply" | "whatsapp"

/** Lo que se elige en la pantalla; se aplica a TODOS los pasos al inscribir. */
export interface LookState {
  image_id: string | null
  personalize: boolean
  email_design: EmailDesign
  cta: { label: string; target: CtaTarget } | null
}

export const DEFAULT_CTA = { label: "Quiero la prueba gratis", target: "reply" as const }

export const CTA_TARGET_LABELS: Record<CtaTarget, string> = {
  reply: "Responder el correo",
  whatsapp: "Ir a tu WhatsApp",
}

/** El look con que abre: el de la secuencia y, si no tiene imagen, la del nicho de la búsqueda. */
export function initialLook(view: SequenceLookViewDTO | null, suggested: string | null): LookState {
  return {
    image_id: view?.image?.id ?? suggested,
    personalize: view?.image?.personalize ?? false,
    email_design: view?.email_design ?? "brand",
    // El botón de la secuencia tal cual (si lo quitaron, sigue quitado); el de
    // por defecto aparece al pasar a «Marca» desde la pantalla.
    cta: view === null ? DEFAULT_CTA : view.cta,
  }
}

export function lookPayload(look: LookState) {
  return {
    image: look.image_id === null ? null : { id: look.image_id, personalize: look.personalize },
    email_design: look.email_design,
    cta: look.email_design === "brand" ? look.cta : null,
  }
}

/** Los valores de `{{1}}`… para un negocio de ejemplo, como los arma el servidor al enviar. */
export function whatsappValues(
  params: readonly string[],
  sample: { business: string; topic: string | null },
): string[] {
  return params.map((source) => {
    if (source === "company_name" || source === "custom_field:company_name") return sample.business
    if (source === "first_name" || source === "full_name") return sample.business
    if (source === "topic") return sample.topic ?? "…"
    if (source.startsWith("static:")) return source.slice("static:".length)
    return "…"
  })
}

/** El cuerpo ya rellenado (para textos y pruebas). */
export function whatsappBody(
  body: string,
  params: readonly string[],
  sample: { business: string; topic: string | null },
): string {
  const values = whatsappValues(params, sample)
  return body.replace(/\{\{\s*(\d+)\s*\}\}/g, (whole, n: string) => values[Number(n) - 1] ?? whole)
}

/** «axi_prospeccion_hoteles_v2» → «Prospección hoteles · v2» (el técnico va debajo, chico). */
export function templateDisplayName(name: string): string {
  const words = name.split("_").filter(Boolean)
  const version = words.length > 1 && /^v\d+$/i.test(words[words.length - 1] ?? "") ? words.pop() : undefined
  if (words[0]?.toLowerCase() === "axi" && words.length > 1) words.shift()
  const text = words.join(" ").replace(/prospeccion/gi, "prospección")
  const human = text.charAt(0).toUpperCase() + text.slice(1)
  return version === undefined ? human : `${human} · ${version.toLowerCase()}`
}

/** El nombre sobre la imagen, cortado por palabras a 40 (como el servidor). */
export function personalizedName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, " ")
  if (name.length <= 40) return name
  const cut = name.slice(0, 41)
  const space = cut.lastIndexOf(" ")
  return space > 0 ? cut.slice(0, space).replace(/[\s,.;:–-]+$/, "") : `${name.slice(0, 39)}…`
}

/** Para «Ver como»: los nombres cortos primero (se leen enteros y son los típicos). */
export function sampleOrder(names: readonly string[]): string[] {
  return [...names].sort((a, b) => a.length - b.length)
}

/** «Inscribí 36 de 38 negocios. No entraron: 2 se dieron de baja.» */
const SKIP_LABELS: Record<string, string> = {
  opted_out: "se dieron de baja",
  task_open: "ya tenían algo en curso",
  no_channel: "no tienen correo ni celular",
  promote_suppressed: "están en tu lista de supresión",
  promote_not_identifiable: "no tienen correo ni teléfono",
  promote_not_promotable: "ya no se pueden contactar",
}

export function resultText(result: SearchOutreachResultDTO): string {
  const skipped = Object.entries(result.skipped)
    .filter(([, count]) => count > 0)
    .map(([reason, count]) => `${count.toLocaleString("es-CO")} ${SKIP_LABELS[reason] ?? "no se pudieron inscribir"}`)
  const head = `Inscribiste ${result.enrolled.toLocaleString("es-CO")} de ${result.leads.toLocaleString("es-CO")} negocios.`
  return skipped.length === 0 ? head : `${head} No entraron: ${skipped.join(", ")}.`
}

/** El nicho de una imagen de axi, para su etiqueta («nicho:hoteles» → «Hoteles»). */
export function isNicheImage(id: string): boolean {
  return id.startsWith("nicho:")
}

/** ¿El look elegido cambia el que la secuencia ya tiene? (sin cambios no se reescribe nada) */
export function lookChanged(look: LookState, view: SequenceLookViewDTO | null): boolean {
  const current = initialLook(view, null)
  return JSON.stringify(lookPayload(look)) !== JSON.stringify(lookPayload(current))
}
