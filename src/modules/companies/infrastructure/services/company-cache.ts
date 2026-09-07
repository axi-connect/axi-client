import type { CompanyDTO } from "@/modules/companies/domain/company"
import { useMyCompanyStore } from "@/modules/companies/infrastructure/stores/my-company.store"

/**
 * Compatibilidad: la API por promesa de `GET /companies/me` que consumen
 * `scheduling` y `onboarding` vía `public.ts`. Desde 2026-09 delega en el
 * store reactivo (`my-company.store.ts`): misma petición única, y además los
 * suscriptores del store (sidebar, banner) se enteran de los cambios.
 */
export function loadMyCompanyOnce(): Promise<CompanyDTO> {
  return useMyCompanyStore.getState().load()
}

/**
 * Invalida tras mutar la empresa desde fuera de «Mi empresa» (p.ej. el
 * horario desde la agenda): el próximo consumidor re-fetchea.
 */
export function invalidateMyCompanyCache(): void {
  useMyCompanyStore.getState().invalidate()
}
