/**
 * Variables de entorno del proceso de test.
 *
 * Va en `setupFiles` (no en `setupFilesAfterEnv`) porque debe correr ANTES de
 * que se evalúe cualquier módulo del test: `core/config/env.ts` resuelve
 * `SALES_WHATSAPP` en carga y lanza si falta, y entra transitivamente por
 * `core/services/http.ts` en casi cualquier suite.
 *
 * Se asigna solo si no viene ya del entorno, para que un test pueda fijar su
 * propio valor antes de recargar el módulo con `jest.isolateModules`.
 */
process.env.NEXT_PUBLIC_SALES_WHATSAPP ??= '573224970950'

// `SITE_URL` se resuelve igual (y también lanza si falta), así que la suite
// necesita un origen válido para cualquier test que toque metadata o SEO.
process.env.NEXT_PUBLIC_APP_URL ??= 'https://axi-connect.co'
