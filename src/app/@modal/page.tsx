/**
 * El slot `@modal` en `/`: no pinta nada.
 *
 * `[...catchAll]` no casa con `/` y un catch-all opcional (`[[...catchAll]]`)
 * rompe `next dev` («You cannot define a route with the same specificity as a
 * optional catch-all route»). Este `page.tsx` es el patrón de Next para que el
 * slot tenga estado propio en la raíz y no conserve un modal interceptado al
 * navegar a `/` (hotfix 22-nov-2026,
 * docs/plans/2026-11-22-hotfix-modal-cerrar-sesion.md).
 */
export default function ModalSlotRoot() {
  return null
}
