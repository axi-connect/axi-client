/**
 * Superficie pública del slice `commercial` (architecture §3.3 regla 5).
 *
 * Consumidores:
 *  - `dashboard`: la franja de la meta (`GoalProgressBlock`, autosuficiente:
 *    carga lo suyo y no expone el store).
 *  - `cmo`: la tarjeta de propuesta enlaza las del método comercial a
 *    `/comercial/acciones/:id` (`isCommercialProposal`, `commercialProposalHref`)
 *    y el briefing pinta el chip «Meta · N %» (`useGoalChip`, autosuficiente:
 *    `null` sin meta, permiso o capacidad).
 *
 * Solo se publica lo que tiene consumidor. `commercial` NO importa de `crm`:
 * enlaza por href.
 */
export { GoalProgressBlock } from "./ui/components/GoalProgressBlock";
export { commercialProposalHref, isCommercialProposal } from "./domain/proposals";
export { useGoalChip, type GoalChip } from "./ui/hooks/use-goal-chip";
