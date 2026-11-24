/**
 * El slot `@modal` en cualquier ruta que no sea un modal interceptado: no pinta
 * nada.
 *
 * En navegación SUAVE Next conserva el último estado de un slot paralelo que
 * no casa con la URL nueva, y lo conserva también en las respuestas de los
 * prefetch. Sin este catch-all, abrir «Cerrar sesión» con la pestaña quieta
 * hacía que el sidebar repitiera sus prefetch con el modal en el árbol, Next
 * guardaba así `/dashboard` y, al volver a entrar en la misma pestaña, el
 * modal aparecía abierto encima del panel (hotfix 22-nov-2026,
 * docs/plans/2026-11-22-hotfix-modal-cerrar-sesion.md). Es el mismo arreglo
 * que `comercial/@sheet/[...catchAll]` (C1).
 *
 * No es opcional (`[[...]]`): un catch-all opcional en un slot choca con la
 * `/` de `(public)` y `next dev` no arranca («same specificity as a optional
 * catch-all route»). `/` la cubre `@modal/page.tsx`. La interceptada
 * `(.)auth/logout` gana por especificidad.
 */
export default function ModalSlotCatchAll() {
  return null
}
