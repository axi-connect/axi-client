/**
 * Superficie pública del slice `commercial` (architecture §3.3 regla 5).
 *
 * Consumidor: `dashboard`, que monta la franja de la meta (`GoalProgressBlock`
 * es autosuficiente: carga lo suyo y no expone el store). Solo se publica lo
 * que tiene consumidor hoy; los tipos y badges del ritmo se añadirán aquí
 * cuando `cmo` los necesite (chip de meta del briefing, F7). `commercial` NO
 * importa de `crm`: enlaza por href.
 */
export { GoalProgressBlock } from "./ui/components/GoalProgressBlock";
