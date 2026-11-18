/**
 * «Preparado para {Empresa}» en la portada de `/overview`, desde `?para=`.
 *
 * Es texto plano que cualquiera puede escribir en un enlace público, así que se sanea antes de pintarlo: solo
 * letras, números y la puntuación de un nombre de negocio, espacios colapsados y un tope de largo. React ya escapa
 * el HTML; esto evita además que alguien mande un enlace con un «Preparado para» abusivo o kilométrico.
 */
export const COMPANY_MAX_LENGTH = 48;

const ALLOWED = /[^\p{L}\p{N} .,&'´’()\-–/+#]/gu;

export function sanitizeCompany(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const clean = raw
    .normalize("NFC")
    .replace(ALLOWED, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, COMPANY_MAX_LENGTH)
    .trim();
  return /[\p{L}\p{N}]/u.test(clean) ? clean : null;
}
