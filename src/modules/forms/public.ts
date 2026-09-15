/**
 * SUPERFICIE PÚBLICA del slice `forms` (architecture.md §3.3 regla 5).
 *
 * Nació con su primer consumidor externo: `crm`, que necesita saber qué
 * campos definen los formularios de captura para calcular la columna «Datos»
 * de la tabla de contactos y para enlazar los datos huérfanos con el editor
 * (`/settings/forms?flow=…`).
 *
 * Se publica la LECTURA y los helpers puros; la escritura (`upsertForm`,
 * `deleteForm`) sigue siendo privada: el único dueño de la definición es el
 * editor de `/settings/forms`.
 */

export { listForms } from "./infrastructure/services/form-service.adapter";

export {
  CONTACT_COLUMN_CODES,
  FLOW_LABELS,
  FORM_FLOWS,
  fieldStorageHint,
  type FormDefinitionDTO,
  type FormFieldDTO,
  type FormFieldType,
  type FormFlow,
  type FormsListDTO,
} from "./domain/form";
