/**
 * El emisor tal como sale en el papel (Cobros premium P6). Espejo de
 * `issuerLines` + `issuerDataFrom` del servidor (`documents/domain/materialize`
 * y `application/issuer_data.ts`): lo que el negocio escribió en los ajustes
 * manda; lo vacío cae a la ficha de Mi empresa, y el NIT siempre sale de allí.
 * Así la isla «Así firma tus papeles» dice lo que imprime el bloque «Partes»,
 * no una versión aproximada.
 */
export interface IssuerDraft {
  legal_name: string;
  tax_id_label: string;
  address: string;
  city: string;
  phone: string;
  email: string;
}

export interface IssuerCompany {
  name: string;
  nit: string | null;
  address: string | null;
  city: string | null;
}

const filled = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value.trim() !== "";

const orCompany = (typed: string, fallback: string | null): string | null =>
  filled(typed) ? typed.trim() : fallback;

export function issuerLines(
  draft: IssuerDraft,
  company: IssuerCompany,
): string[] {
  const label = filled(draft.tax_id_label) ? draft.tax_id_label.trim() : "NIT";
  const taxId = filled(company.nit) ? `${label} ${company.nit}` : null;
  const place = [
    orCompany(draft.address, company.address),
    orCompany(draft.city, company.city),
  ]
    .filter(filled)
    .join(", ");
  return [
    filled(draft.legal_name) ? draft.legal_name.trim() : company.name,
    taxId,
    place,
    draft.phone.trim(),
    draft.email.trim(),
  ].filter(filled);
}
