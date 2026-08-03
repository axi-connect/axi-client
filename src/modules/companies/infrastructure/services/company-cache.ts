import type { CompanyDTO } from "@/modules/companies/domain/company"
import { getMyCompany } from "@/modules/companies/infrastructure/services/company-service.adapter"

/**
 * Cache a nivel de módulo de `GET /companies/me`: una sola petición por
 * sesión de página, compartida entre consumidores (identidad del sidebar,
 * chip y banner de trial). Se limpia en fallo para permitir reintento en
 * otro montaje.
 */
let companyPromise: Promise<CompanyDTO> | null = null

export function loadMyCompanyOnce(): Promise<CompanyDTO> {
  if (!companyPromise) {
    companyPromise = getMyCompany().catch((err: unknown) => {
      companyPromise = null
      throw err
    })
  }
  return companyPromise
}
