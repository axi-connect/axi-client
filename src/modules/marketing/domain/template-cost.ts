import { TEMPLATE_COST_CO_USD, type HsmTemplateDTO } from "./template-catalog";

/**
 * Lo que cuesta abrir conversaciones con una plantilla de Meta.
 *
 * Vive en `marketing` porque aquí vive la tarifa (`TEMPLATE_COST_CO_USD`) y
 * porque lo consumen los dos sitios que abren en lote: el seguimiento masivo
 * del CRM y el asistente de campañas. Estaba en `crm/domain/bulk-follow-up.ts`,
 * que importaba la tarifa de aquí — la dependencia iba al revés y `marketing`
 * no podía reutilizarlo sin crear un ciclo.
 */

export type BulkOpeningCost = {
  /** Lo que Meta cobra por cada apertura entregada, según su categoría. */
  unit_usd: number;
  /** Tope: lo que costaría si TODOS estuvieran fuera de la ventana de 24 h. */
  total_usd: number;
  /** Marketing cuesta ~25× una utility: la cifra cambia de orden de magnitud. */
  category: HsmTemplateDTO["category"];
};

/**
 * Cuánto puede costar abrir un lote con una plantilla de Meta.
 *
 * Está en el dominio y no dentro del modal por lo que salió en la auditoría de
 * F4a: el componente multiplicaba por `0.0008` a pelo, que es la tarifa de una
 * **utility**, mientras el selector admite también **marketing** — 25× más. Dar
 * una cifra concreta y equivocada es peor que no darla: el operador la usa para
 * decidir. Con el cálculo aquí, la tarifa sale del catálogo y hay un test que
 * lo fija.
 *
 * Es un TOPE, no una previsión: solo se cobra a quien esté fuera de la ventana
 * de 24 h cuando le toque su turno, y eso no se sabe al programar.
 */
export function bulkOpeningCost(
  eligible: number,
  category: HsmTemplateDTO["category"],
): BulkOpeningCost {
  const unit = TEMPLATE_COST_CO_USD[category];
  return {
    unit_usd: unit,
    total_usd: Math.max(0, eligible) * unit,
    category,
  };
}

/**
 * «US$0,0008» / «US$5,36» — con los decimales que cada cifra necesita.
 *
 * No confundir con el `formatUsd` de `platform/domain/margin.ts`, que da
 * «$0.0016» en formato inglés: aquél es de la consola interna y este es lo que
 * ve el inquilino, que lee en es-CO.
 */
export function formatUsd(usd: number, decimals = 2): string {
  return `US$${usd.toLocaleString("es-CO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
