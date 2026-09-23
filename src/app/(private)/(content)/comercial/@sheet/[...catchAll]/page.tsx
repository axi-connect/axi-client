/**
 * El slot `@sheet` en cualquier otra ruta de `/comercial/*` (hoy
 * `/comercial/meta`): no pinta nada.
 *
 * En navegación SUAVE Next conserva el último estado de un slot paralelo que
 * no casa con la URL nueva. Sin este catch-all, «Corregir» en el detalle de un
 * resultado o «Definir la meta» dejaban el panel abierto ENCIMA del editor de
 * la meta. Las rutas interceptadas `(.)acciones/[id]` y `(.)resultados/[key]`
 * ganan a este catch-all por especificidad.
 */
export default function ComercialSheetCatchAll() {
  return null;
}
