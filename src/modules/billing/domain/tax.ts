import type { InvoiceLineDTO } from "./invoice";

/**
 * Tratamiento fiscal de una línea, en TypeScript puro.
 *
 * **Los impuestos van por línea, nunca globales.** Una misma factura puede
 * llevar una línea excluida (la licencia) y otra gravada al 19 % (una
 * capacitación), así que sumar «un IVA de la factura» es incorrecto: se usa el
 * `tax_cents` de cada línea.
 */
export type TaxTreatment = "excluded" | "taxed" | "exempt";

/**
 * Etiqueta fiscal de la línea.
 *
 * **«Excluido de IVA», jamás «IVA 0 %».** La licencia SaaS está excluida por el
 * Art. 476 num. 21 del Estatuto Tributario (computación en la nube), ratificado
 * por el Concepto DIAN 190 de 2024. Excluido no es exento ni gravado al 0 %: son
 * tres figuras tributarias distintas, y a un contador le chirría la confusión.
 */
export function taxLabel(treatment: string, rateBps = 0): string {
  switch (treatment) {
    case "excluded":
      return "Excluido de IVA";
    case "exempt":
      return "Exento de IVA";
    case "taxed":
      return rateBps > 0 ? `IVA ${String(rateBps / 100)} %` : "Gravado";
    default:
      // Un tratamiento desconocido se muestra crudo antes que traducirse a la
      // fuerza: en materia fiscal, inventar una etiqueta es peor que no tenerla.
      return treatment;
  }
}

/**
 * Nota fiscal de una línea del detalle del TENANT.
 *
 * ⚠️ La línea de `InvoiceDetailDto` trae **solo `tax_cents`**: no viaja el
 * `tax_treatment` ni el `tax_rate_bps` (sí lo hacen las tarifas de plataforma y
 * el export de habeas data). Así que desde el panel del tenant no se puede
 * afirmar por línea si algo está excluido, exento o gravado al 0 % — las tres
 * figuras dan `tax_cents: 0` y son tributariamente distintas.
 *
 * Por eso esta función devuelve `null` cuando no hay impuesto en vez de escribir
 * «Excluido de IVA» por su cuenta: la exclusión de la licencia se declara **una
 * vez a nivel de documento**, donde sí es cierta por ley, y no se le atribuye a
 * cada fila adivinando. Con impuesto sí se puede ser preciso, porque el importe
 * está ahí.
 */
export function lineTaxNote(line: Pick<InvoiceLineDTO, "tax_cents">): string | null {
  return line.tax_cents > 0 ? "IVA incluido" : null;
}

/** ¿Alguna línea lleva impuesto? Decide si el desglose muestra la fila. */
export function hasTaxes(lines: readonly Pick<InvoiceLineDTO, "tax_cents">[]): boolean {
  return lines.some((line) => line.tax_cents > 0);
}

/** Suma de impuestos del documento, línea a línea. */
export function totalTaxCents(
  lines: readonly Pick<InvoiceLineDTO, "tax_cents">[],
): number {
  return lines.reduce((sum, line) => sum + line.tax_cents, 0);
}
