/**
 * La paleta de dataviz vive en `shared/components/features/charts/chart-theme`:
 * la consumen dashboard, analytics y marketing, y un slice no puede importar de
 * otro por ruta profunda (arquitectura §3.3.5) — `analytics` lo venía haciendo.
 * Este archivo se conserva como re-export para no tocar los consumidores.
 */
export {
  CHART_COLORS,
  DATAVIZ_SEQUENCE,
  AXIS_COLOR,
  GRID_COLOR,
  TOOLTIP_STYLE,
} from "@/shared/components/features/charts/chart-theme";
