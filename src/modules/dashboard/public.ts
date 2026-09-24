/**
 * Superficie pública del slice `dashboard` (architecture §3.3 regla 5).
 *
 * Consumidor: `analytics`, que compone sus tarjetas con la misma card y el mismo
 * tile de métrica del Panel (`DashboardCard`, `MetricTile`) en vez de duplicar
 * la superficie. Antes los importaba por ruta profunda.
 */
export { DashboardCard, MetricTile } from "./ui/components/MetricTile";
