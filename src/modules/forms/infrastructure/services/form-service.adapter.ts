import { http } from "@/core/services/http";
import type { Schemas } from "@/core/api/types";
import type { FormDefinitionDTO, FormFieldDTO, FormFlow, FormsListDTO } from "@/modules/forms/domain/form";

/**
 * Adapter HTTP del slice forms → `/forms`. La clave del recurso es el FLOW.
 *
 * `is_active` es REQUERIDO a propósito, aunque el contrato generado
 * (`UpsertFormDto`) lo declare opcional: el PUT del backend interpreta la
 * OMISIÓN como `true` (`upsert_form.use_case.ts`: `input.is_active ?? true`),
 * así que un guardado sin el campo REACTIVARÍA en silencio un formulario
 * pausado — la IA volvería a exigir los datos y el guard a bloquear pedidos sin
 * que nadie tocara el switch.
 *
 * El tipo, no una convención, es lo que impide la regresión. NO relajar a
 * opcional, y NO añadir un toggle con guardado inmediato: debe haber una sola
 * ruta de escritura (el submit del formulario), porque un toggle tendría que
 * enviar el `fields` del borrador a medio editar.
 */
export type UpsertFormInput = {
  fields: FormFieldDTO[];
  is_active: boolean;
};

/**
 * Devuelve solo los formularios EXISTENTES (0..3), incluidos los inactivos. Un
 * flujo sin configurar no aparece: usar `synthesizeForms()` del domain para
 * completar los tres. Sin paginación (máx 3 filas por tenant).
 */
export function listForms(): Promise<FormsListDTO> {
  return http.get<FormsListDTO>("/forms");
}

/** PUT de reemplazo total: sobrescribe `fields` entero y el estado activo. */
export function upsertForm(flow: FormFlow, input: UpsertFormInput): Promise<FormDefinitionDTO> {
  return http.put<FormDefinitionDTO>(`/forms/${flow}`, input satisfies Schemas["UpsertFormDto"]);
}

/**
 * Borrado físico de la definición (204 sin body). NO borra los datos ya
 * capturados: viven como documento en `contact.custom_fields` y
 * `order.intake_data`, sin FK a la definición.
 *
 * 404 `forms/not_found` si el flujo no estaba configurado — la UI lo trata como
 * éxito idempotente, no como error (caso real: dos pestañas abiertas).
 */
export function deleteForm(flow: FormFlow): Promise<void> {
  return http.delete(`/forms/${flow}`);
}
