/**
 * SUPERFICIE PÚBLICA del slice `companies` (architecture.md §3.3).
 *
 * Lo que otros slices pueden consumir de la empresa del tenant se declara
 * AQUÍ y solo aquí; un import de `@/modules/companies/...` desde otro slice
 * es una violación de frontera.
 *
 * Consumidores actuales: `modules/scheduling` (zona horaria del negocio y
 * franjas del horario de atención, que gobiernan el calendario y a la IA).
 */

export {
  WEEKDAY_LABELS,
  type CompanyDTO,
  type CompanySchedule,
} from "./domain/company";

/** Cache por sesión de `GET /companies/me` (una sola petición compartida). */
export { loadMyCompanyOnce } from "./infrastructure/services/company-cache";
