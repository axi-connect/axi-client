import type { OutreachSignatureDTO, UpdateOutreachSignatureDTO } from "@/modules/companies/domain/company"

/**
 * B2 · la firma comercial: quién firma los correos de prospección. Espejo de
 * `outreach/domain/signature.ts` (servidor): mismos límites y solo https.
 */
export const SIGNATURE_LIMITS = { person_name: 80, title: 80, phone: 30, url: 300 } as const

export type SignatureForm = {
  person_name: string
  title: string
  photo_url: string
  phone: string
  website: string
}

export type SignatureErrors = Partial<Record<keyof SignatureForm, string>>

export function formFromSignature(signature: OutreachSignatureDTO): SignatureForm {
  return {
    person_name: signature.person_name ?? "",
    title: signature.title ?? "",
    photo_url: signature.photo_url ?? "",
    phone: signature.phone ?? "",
    website: signature.website ?? "",
  }
}

function isHttps(value: string): boolean {
  try {
    return new URL(value).protocol === "https:"
  } catch {
    return false
  }
}

export function validateSignature(form: SignatureForm): SignatureErrors {
  const errors: SignatureErrors = {}
  for (const key of ["photo_url", "website"] as const) {
    const value = form[key].trim()
    if (value !== "" && !isHttps(value)) errors[key] = "Debe ser una dirección https://"
  }
  return errors
}

/** Vacío = sin ese dato (null en el PUT). */
export function signaturePayload(form: SignatureForm): UpdateOutreachSignatureDTO {
  const clean = (value: string) => (value.trim() === "" ? null : value.trim())
  return {
    person_name: clean(form.person_name),
    title: clean(form.title),
    photo_url: clean(form.photo_url),
    phone: clean(form.phone),
    website: clean(form.website),
  }
}

/** «Cristian Velásquez» → «CV». */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
}

/** Las líneas de la firma tal como cierra el correo. Sin persona, firma el negocio. */
export function signatureLines(
  signature: OutreachSignatureDTO,
  businessName: string,
): { name: string; role: string | null; contact: string | null } {
  const person = signature.person_name
  const role = signature.title !== null ? `${signature.title} · ${businessName}` : person !== null ? businessName : null
  const site = signature.website === null ? null : signature.website.replace(/^https:\/\//, "").replace(/\/$/, "")
  const contact = [site, signature.phone].filter((part): part is string => part !== null).join(" · ")
  return { name: person ?? businessName, role, contact: contact === "" ? null : contact }
}
