/**
 * Superficie pública del slice `commercial` (architecture §3.3 regla 5).
 *
 * Consumidores: `dashboard`, que monta la franja de la meta (`GoalProgressBlock`
 * es autosuficiente: carga lo suyo y no expone el store). Los tipos y los
 * badges del ritmo se publican para que `cmo` (chip de meta en el briefing,
 * F7) hable el mismo vocabulario sin importar por ruta profunda. `commercial`
 * NO importa de `crm`: enlaza por href.
 */
export { GoalProgressBlock } from "./ui/components/GoalProgressBlock";
export { PACE_BADGES } from "./domain/labels";
export type { PaceStatus, SourceKind } from "./domain/commercial";
