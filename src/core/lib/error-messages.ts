import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";

/**
 * Mensajes en español por `code` RFC 7807 del backend.
 * Cae al `detail`/`title` del problema (en dev añade el `trace_id` para soporte).
 */
const MESSAGES_BY_CODE: Record<string, string> = {
  [API_ERROR_CODES.validationFailed]: "Revisa los campos marcados",
  [API_ERROR_CODES.invalidCredentials]: "Correo o contraseña incorrectos",
  [API_ERROR_CODES.ambiguousCompany]: "Tu correo existe en varias empresas: indica el NIT",
  [API_ERROR_CODES.unauthorized]: "Tu sesión expiró. Vuelve a iniciar sesión",
  [API_ERROR_CODES.refreshReuseDetected]: "Por seguridad tu sesión fue revocada. Inicia sesión de nuevo",
  [API_ERROR_CODES.companySuspended]: "La empresa está suspendida. Contacta a soporte",
  [API_ERROR_CODES.trialExpired]: "Tu prueba gratuita terminó. Contáctanos para activar tu plan",
  [API_ERROR_CODES.permissionDenied]: "No tienes permiso para realizar esta acción",
  [API_ERROR_CODES.usageLimitExceeded]: "Alcanzaste el límite de uso del plan",
  [API_ERROR_CODES.outsideServiceWindow]: "Fuera de la ventana de 24 h de WhatsApp: se requiere plantilla",
  [API_ERROR_CODES.invalidTransition]: "La conversación no admite esa transición",
  [API_ERROR_CODES.handoffConflict]: "Otro operador tomó la conversación primero",
  [API_ERROR_CODES.notFound]: "El recurso ya no existe",
  "identities/nit_taken": "Ya existe una empresa con ese NIT",
  "identities/email_taken": "Ya existe un usuario con ese correo",
  // Panel de plataforma (super admin) — tabla §7 de frontend_platform_plan.md
  "tenant_db/not_found": "El tenant no tiene base de datos dedicada configurada",
  "tenant_db/not_active":
    "Enterprise requiere una base de datos dedicada activa. Configúrala y provisiónala primero",
  "tenant_db/in_use": "El plan enterprise usa esta base. Cambia el plan del tenant primero",
  "tenant_db/provision_in_progress": "Provisión en curso; espera a que termine",
  "tenant_db/connection_failed": "No se pudo conectar. Verifica host, puerto, credenciales y firewall",
  "tenant_db/unsupported_version": "Versión de PostgreSQL no soportada",
  "tenant_db/version_mismatch": "Las migraciones están desactualizadas: reprovisiona la base",
  "tenant_db/missing_extension": "Falta una extensión (pg_trgm/unaccent) en la base destino",
  "tenant_db/insufficient_privileges": "El usuario necesita privilegio CREATE sobre la base",
  "usage/plan_code_taken": "Ya existe un plan con ese código",
  "usage/plan_not_found": "El plan no existe",
  "usage/plan_inactive": "El plan está desactivado",
  "usage/plan_tier_immutable": "El tier del plan no puede cambiarse",
  "usage/limit_invalid": "El set de límites es inválido: revisa las filas marcadas",
  "identities/owner_protected": "El usuario owner no puede modificarse así",
  "rbac/system_role_immutable": "Los roles de sistema no se pueden modificar",
  "rbac/role_not_found": "El rol ya no existe",
  "ai/template_immutable": "Las plantillas del sistema no se pueden modificar",
  "ai/character_in_use": "El character está en uso por un agente",
  "ai/intention_code_taken": "Ya existe una intención con ese código",
  "channels/provider_account_taken": "Ese número/cuenta ya está conectado en otro canal",
  "channels/invalid_credentials": "Las credenciales del canal no son válidas",
  "channels/not_connected": "El canal no está conectado",
  "channels/qr_not_available": "El código QR aún no está disponible",
  "channels/no_worker_available": "No hay workers de WhatsApp Web disponibles",
  // Media saliente y acciones rápidas (F9)
  "conversations/upload_not_found": "El adjunto ya no existe: vuelve a subirlo",
  "conversations/upload_already_used": "Ese adjunto ya fue enviado",
  "conversations/upload_unsupported_type": "Tipo de archivo no soportado",
  "conversations/upload_too_large": "El archivo supera el tamaño permitido",
  "conversations/voice_note_transcode_failed":
    "No se pudo procesar la nota de voz. Intenta grabarla de nuevo",
  "channels/template_not_supported": "Este canal no soporta plantillas",
  "quick_actions/not_found": "La acción rápida ya no está disponible",
  "quick_actions/asset_not_found": "El archivo de la acción ya no existe",
  "quick_actions/asset_in_use": "El archivo está en uso por una acción activa",
  "quick_actions/name_taken": "Ya existe una acción con ese nombre",
  "quick_actions/invalid_config": "La acción está mal configurada",
  // Catálogo (F8)
  "catalog/catalog_not_found": "El catálogo ya no existe",
  "catalog/category_not_found": "La categoría ya no existe",
  "catalog/product_type_not_found": "El tipo de producto ya no existe",
  "catalog/product_not_found": "El producto ya no existe",
  "catalog/variant_not_found": "La variante ya no existe",
  "catalog/attribute_not_found": "El atributo ya no existe",
  "catalog/duplicate_code": "Ya existe un catálogo con ese código",
  "catalog/duplicate_sku": "Ya existe una variante con ese SKU",
  "catalog/duplicate_variant": "Ya existe una variante con esa combinación de atributos",
  "catalog/category_in_use": "La categoría tiene subcategorías o productos asociados",
  "catalog/product_type_in_use": "El tipo de producto está en uso por productos",
  "catalog/category_cycle": "Una categoría no puede ser descendiente de sí misma",
  "catalog/category_too_deep": "Alcanzaste la profundidad máxima de categorías (6 niveles)",
  "catalog/attribute_invalid": "Algún atributo tiene un valor inválido para su tipo",
  "catalog/service_fields_required": "Un servicio requiere duración en minutos",
  "catalog/stock_not_applicable": "Los servicios no manejan inventario",
  "catalog/last_variant_protected": "No puedes eliminar la última variante activa del producto",
  // Catálogo — imágenes (F16)
  "catalog/invalid_image": "La imagen no es válida: usa JPEG, PNG o WebP de máximo 5 MB",
  "catalog/image_limit_reached": "Alcanzaste el límite de fotos de esta galería",
  "catalog/image_not_found": "No encontramos esa imagen. Recarga e inténtalo de nuevo",
  // Pedidos (F11)
  "orders/not_found": "El pedido ya no existe",
  "orders/variant_not_found": "Algún producto del pedido ya no está disponible",
  "orders/empty_order": "El pedido no tiene productos",
  "orders/insufficient_stock": "No hay stock suficiente para confirmar el pedido",
  "orders/invalid_transition": "El pedido ya cambió de estado. Actualiza e inténtalo de nuevo",
  "orders/active_order_exists": "La conversación ya tiene un pedido activo",
  "orders/currency_mismatch": "Los productos del pedido mezclan monedas distintas",
  "orders/not_editable": "El pedido ya no se puede editar",
  "orders/payment_not_found": "El pago ya no existe",
  "orders/payment_already_verified": "El pago ya fue verificado o rechazado",
  "orders/no_payment_evidence": "El pago no tiene comprobante adjunto",
  "orders/no_payable_order": "El pedido no admite pagos en su estado actual",
  // CRM (F0) — contactos
  "contacts/not_found": "El contacto ya no existe",
  "contacts/duplicate_identity": "Ya existe un contacto con ese teléfono o correo",
  "contacts/merge_self": "No puedes fusionar un contacto consigo mismo",
  // CRM (F0) — pipelines, deals, actividades, tags, segmentos, import/export
  "crm/pipeline_not_found": "El pipeline ya no existe",
  "crm/pipeline_name_taken": "Ya existe un pipeline con ese nombre",
  "crm/pipeline_in_use": "El pipeline tiene oportunidades abiertas: elige a dónde moverlas",
  "crm/stage_not_found": "La etapa ya no existe",
  "crm/stage_in_use": "La etapa tiene oportunidades: elige a qué etapa moverlas",
  "crm/stage_last_protected": "El pipeline necesita al menos una etapa",
  "crm/stage_reorder_mismatch": "El orden de etapas cambió. Recarga e inténtalo de nuevo",
  "crm/deal_not_found": "La oportunidad ya no existe",
  "crm/deal_already_open": "La conversación ya tiene una oportunidad abierta",
  "crm/invalid_deal_transition": "La oportunidad ya cambió de estado. Actualiza e inténtalo de nuevo",
  "crm/activity_not_found": "La actividad ya no existe",
  "crm/not_a_task": "Esa actividad no es una tarea",
  "crm/invalid_task_fields": "Vencimiento y asignación solo aplican a tareas",
  "crm/tag_not_found": "La etiqueta ya no existe",
  "crm/tag_name_taken": "Ya existe una etiqueta con ese nombre",
  "crm/segment_not_found": "El segmento ya no existe",
  "crm/segment_name_taken": "Ya existe un segmento con ese nombre",
  "crm/import_not_found": "El import ya no existe",
  "crm/import_missing_file": "Adjunta un archivo CSV para importar",
  "crm/import_invalid_file": "El archivo no es un CSV válido. Revisa las columnas y el formato",
  "crm/import_too_large": "El archivo supera el límite (10 MB / 20.000 filas)",
  "crm/export_invalid_filters": "Los filtros de la exportación no son válidos",
  // Formularios de captura (F10)
  "forms/not_found": "El formulario ya no existe",
  "forms/invalid_definition":
    "La definición del formulario no es válida: revisa códigos, tipos y opciones",
  // No sale de /forms (lo lanzan las tools de cierre); se mapea para no mostrar el detail crudo
  "forms/invalid_data": "Los datos capturados no cumplen el formulario",
  // Calidad (consola platform) — quality_frontend_implementation_plan.md.
  // Los 409/422 con `details` (tenant_not_eligible, spend_cap_exceeded) se
  // enriquecen en la UI con los helpers de domain/quality-runs.ts.
  "quality/scenario_not_found": "El escenario ya no existe o está archivado",
  "quality/suite_not_found": "La suite ya no existe o no tiene escenarios activos",
  "quality/run_not_found": "La ejecución ya no existe",
  "quality/conversation_not_found": "La conversación ya no existe",
  "quality/scenario_immutable": "Los escenarios de sistema no se pueden modificar: clónalo para editarlo",
  "quality/suite_immutable": "Las suites de sistema no se pueden modificar: clónala para editarla",
  "quality/scenario_code_taken": "Ya existe un escenario con ese código",
  "quality/suite_code_taken": "Ya existe una suite con ese código",
  "quality/run_already_active": "El tenant ya tiene una ejecución activa: espera a que termine o cancélala",
  "quality/tenant_not_eligible": "El tenant no es elegible para esta ejecución",
  "quality/run_not_cancelable": "La ejecución ya terminó: no se puede cancelar",
  "quality/run_not_purgeable": "La ejecución sigue activa: espera a que termine para purgar",
  "quality/spend_cap_exceeded": "El tope de gasto no alcanza para la ejecución estimada",
  "platform/forbidden": "Tu cuenta no tiene acceso a la consola de plataforma",
  "client/network": "No fue posible contactar al servidor",
};

export function errorMessage(error: unknown, fallback = "Ocurrió un error inesperado"): string {
  if (isHttpError(error)) {
    const known = MESSAGES_BY_CODE[error.code];
    if (known) return known;
    if (error.status === 429) {
      const wait = error.retryAfterSeconds ? ` Reintenta en ${error.retryAfterSeconds}s.` : "";
      return `Demasiadas peticiones.${wait}`;
    }
    const base = error.problem?.detail || error.problem?.title || fallback;
    if (process.env.NODE_ENV !== "production" && error.problem?.trace_id) {
      return `${base} (trace: ${error.problem.trace_id})`;
    }
    return base;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/**
 * Mapea los issues de `validation/failed` (`errors[]` con `path` de Zod del
 * backend) a los campos del form RHF. Devuelve true si aplicó al menos uno
 * (la UI puede omitir el toast general en ese caso).
 *
 * Los índices numéricos del path se conservan: un issue en
 * `["fields", 3, "code"]` produce `"fields.3.code"`, que es exactamente el
 * nombre que usa `useFieldArray`. Filtrarlos daría `"fields.code"`, un campo
 * inexistente, y el error se perdería en silencio.
 */
export function applyServerValidation<TValues extends FieldValues>(
  error: unknown,
  form: UseFormReturn<TValues>,
): boolean {
  if (!isHttpError(error) || !error.is(API_ERROR_CODES.validationFailed)) return false;

  let applied = false;
  for (const issue of error.validationIssues) {
    const field = issue.path?.map(String).join(".");
    if (!field) continue;
    form.setError(field as Path<TValues>, { type: "server", message: issue.message });
    applied = true;
  }
  return applied;
}
