/**
 * SUPERFICIE PÚBLICA del slice `companies` (architecture.md §3.3).
 *
 * Lo que otros slices pueden consumir de la empresa del tenant se declara
 * AQUÍ y solo aquí; un import de `@/modules/companies/...` desde otro slice
 * es una violación de frontera.
 *
 * Consumidores actuales: `modules/scheduling` (zona horaria del negocio y
 * franjas del horario de atención, que gobiernan el calendario y a la IA),
 * `modules/onboarding` y `modules/dashboard` (la empresa reactiva del banner).
 */

export {
  WEEKDAY_LABELS,
  type CompanyDTO,
  type CompanySchedule,
} from "./domain/company";

/** Cache por sesión de `GET /companies/me` (una sola petición compartida). */
export {
  loadMyCompanyOnce,
  invalidateMyCompanyCache,
} from "./infrastructure/services/company-cache";

/**
 * La empresa como estado REACTIVO (store): quien la muestra (banner del
 * dashboard, identidad del sidebar) se repinta al guardar «Mi empresa».
 */
export { useMyCompany } from "./infrastructure/hooks/use-my-company";

/**
 * Editor autocontenido del horario de atención (`PUT /companies/me/schedules`).
 * Lo embebe la Configuración de la agenda: el horario gobierna la
 * disponibilidad del calendario y de la IA.
 */
export { SchedulesEditor } from "./ui/forms/SchedulesEditor";
