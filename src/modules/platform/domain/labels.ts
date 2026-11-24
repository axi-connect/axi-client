/**
 * Diccionario de rótulos humanos del panel de plataforma (rediseño F1).
 *
 * Regla del plan (§2, «palabras de persona»): el panel nunca enseña el código
 * del sistema como texto principal (`platform.tenant_created`, `sbs`,
 * `find_people`, `America/Bogota`…). Se muestra la palabra de persona y el
 * código queda en el `title` para quien lo necesite (`humanLabel`).
 *
 * Un código que no está en el diccionario se muestra TAL CUAL, marcado como
 * desconocido: un valor nuevo del servidor tiene que verse raro (y que alguien
 * lo añada aquí), nunca parecer bien por accidente. TypeScript puro.
 */
import { COUNTRIES } from "@/shared/data/countries";

export type LabelDictionary = Readonly<Record<string, string>>;

export type HumanLabel = {
  /** Lo que se lee. */
  label: string;
  /** El código original, para el `title`. */
  code: string;
  /** `false` = el código no está en el diccionario y `label` es el código crudo. */
  known: boolean;
};

export function humanLabel(dictionary: LabelDictionary, code: string | null | undefined): HumanLabel {
  const raw = code ?? "";
  const label = Object.prototype.hasOwnProperty.call(dictionary, raw) ? dictionary[raw] : undefined;
  return label !== undefined ? { label, code: raw, known: true } : { label: raw, code: raw, known: false };
}

// ─── Empresas ──────────────────────────────────────────────────────────────

/** Estado de una empresa (femenino: «la empresa»). */
export const TENANT_STATUS_LABELS: LabelDictionary = {
  active: "Activa",
  trial: "En prueba",
  suspended: "Suspendida",
};

/** El mismo estado en plural, para los filtros de una lista de empresas. */
export const TENANT_STATUS_PLURAL_LABELS: LabelDictionary = {
  active: "Activas",
  trial: "En prueba",
  suspended: "Suspendidas",
};

/** Por qué una empresa está en su estado (`status_reason`). */
export const TENANT_STATUS_REASON_LABELS: LabelDictionary = {
  trial_assigned: "Prueba asignada",
  trial_converted: "Pasó de prueba a cliente",
  trial_expired: "La prueba venció",
  platform_admin: "Suspendida a mano",
  payment_overdue: "Pago vencido",
  fraud: "Bloqueada por fraude",
};

/** Roles de los usuarios de una empresa (`role_code` de los roles del sistema). */
export const TENANT_ROLE_LABELS: LabelDictionary = {
  owner: "Dueño",
  admin: "Administrador",
  supervisor: "Supervisor",
  operator: "Operador",
};

/** Tipo de plan (`tier`): dónde viven los datos de la empresa. */
export const PLAN_TIER_LABELS: LabelDictionary = {
  sbs: "Base compartida",
  enterprise: "Base dedicada",
};

// ─── Personal de axi ───────────────────────────────────────────────────────

/** Rol del admin de plataforma (claim `platform_role`). */
export const PLATFORM_ROLE_LABELS: LabelDictionary = {
  super_admin: "Administración total",
  support: "Soporte",
  billing_ops: "Cobros",
};

// ─── Alertas y calidad ─────────────────────────────────────────────────────

/** Reglas de anomalía del agente (`alert.rule`, `anomaly_rules.ts` del servidor). */
export const ALERT_RULE_LABELS: LabelDictionary = {
  ai_failures_spike: "Fallos repetidos del agente",
  escalation_rate: "Muchas conversaciones pasan a una persona",
  latency_p95: "El agente tarda en responder",
  low_score_streak: "Varias conversaciones mal calificadas seguidas",
  hallucination_detected: "El agente inventó información",
  tool_unproductive_streak: "El agente repite una búsqueda sin resultado",
  catalog_denial_rate: "El agente niega productos que sí hay",
};

/** Severidad de una alucinación según el juez (`hallucination_severity`). */
export const HALLUCINATION_SEVERITY_LABELS: LabelDictionary = {
  none: "Ninguna",
  minor: "Leve",
  major: "Grave",
};

/** Severidad de un problema que señala el juez (`issue.severity`). */
export const ISSUE_SEVERITY_LABELS: LabelDictionary = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

// ─── Proveedores de datos ──────────────────────────────────────────────────

/** Lo que sabe hacer un proveedor de la captación (incluye `find_people`, que faltaba). */
export const PROVIDER_CAPABILITY_LABELS: LabelDictionary = {
  verify_email: "Verifica correos",
  verify_phone: "Verifica teléfonos",
  identity_lookup: "Confirma identidad",
  enrich_person: "Datos de personas",
  enrich_company: "Datos de empresas",
  find_people: "Encuentra a quién decide",
  discover: "Busca negocios",
  extract_site: "Lee sitios web",
  geocode: "Ubica direcciones",
};

// ─── Auditoría ─────────────────────────────────────────────────────────────

/**
 * Acciones de la auditoría. Las de plataforma salen del servidor
 * (`action: 'platform.…'`, barrido del 2026-11-24); las de autenticación y
 * tenancy son las que el visor ya ofrecía en su filtro.
 */
export const AUDIT_ACTION_LABELS: LabelDictionary = {
  // Empresas
  "platform.tenant_created": "Creó la empresa",
  "platform.tenant_updated": "Cambió la empresa",
  "platform.trial_started": "Inició o extendió la prueba",
  "platform.subscription_activated": "Activó la suscripción",
  "platform.activation": "Activó la cuenta",
  "platform.activation_read": "Consultó la activación",
  "platform.activation_reconcile": "Concilió la activación",
  "platform.tenant_integrations_updated": "Cambió las integraciones",
  "platform.tenant_agents_read": "Consultó los agentes",
  // Plan y límites
  "platform.tenant_plan_assigned": "Asignó un plan",
  "platform.tenant_plan_read": "Consultó el plan",
  "platform.tenant_limits_replaced": "Cambió los límites",
  "platform.tenant_limits_read": "Consultó los límites",
  "platform.feature_override": "Cambió una función",
  "platform.feature_override_set": "Forzó una función",
  // Entrega y oferta
  "platform.tenant_delivered": "Envió la bienvenida",
  "platform.tenant_delivery_resent": "Reenvió la bienvenida",
  "platform.delivery_mail_status": "Estado del correo de bienvenida",
  "platform.tenant_offer_quoted": "Cotizó la oferta",
  "platform.tenant_offer_read": "Consultó la oferta",
  // Voz
  "platform.tenant_voice_settings_updated": "Cambió la voz",
  "platform.tenant_voice_read": "Consultó la voz",
  "platform.tenant_tts_credential_set": "Guardó la llave de voz",
  "platform.tenant_tts_credential_removed": "Quitó la llave de voz",
  // Base de datos
  "platform.tenant_database_updated": "Cambió la base de datos",
  "platform.tenant_database_validated": "Validó la base de datos",
  "platform.tenant_database_provision_requested": "Pidió una base dedicada",
  "platform.tenant_database_disabled": "Apagó la base dedicada",
  "platform.tenant_database_disable_check": "Revisó si se puede apagar la base",
  "platform.tenant_db_provisioned": "Base dedicada lista",
  "platform.tenant_db_provision_failed": "Falló la base dedicada",
  "platform.tenant_data_migration_started": "Empezó a migrar los datos",
  "platform.tenant_data_migration_completed": "Terminó de migrar los datos",
  "platform.tenant_data_migration_failed": "Falló la migración de datos",
  "platform.tenant_data_migration_check": "Revisó la migración de datos",
  // Soporte
  "platform.support_session_issued": "Entró como soporte",
  "platform.support_session_revoked": "Cerró una sesión de soporte",
  "platform.support_sessions_exported": "Exportó las sesiones de soporte",
  // Almacenamiento
  "platform.storage_quota_set": "Cambió la cuota de almacenamiento",
  "platform.storage_retention_updated": "Cambió la retención",
  "platform.storage_retention_run": "Corrió la retención",
  "platform.storage_purge_previewed": "Previsualizó una depuración",
  "platform.storage_purge_executed": "Depuró archivos",
  "platform.storage_backfill_started": "Empezó a medir el almacenamiento",
  // Catálogo comercial y precios de la IA
  "platform.plan_created": "Creó un plan",
  "platform.plan_updated": "Cambió un plan",
  "platform.pricing_created": "Creó una tarifa de IA",
  "platform.pricing_updated": "Cambió una tarifa de IA",
  "platform.fx_rate_set": "Fijó la tasa de cambio",
  "platform.fx_refresh_requested": "Pidió actualizar la tasa de cambio",
  // Llamadas
  "platform.calls_assign_number": "Asignó un número",
  "platform.calls_tenant_agents": "Consultó los agentes de llamadas",
  "platform.service_messages_by_number": "Consultó mensajes de servicio",
  // IA
  "platform.decision_route_updated": "Cambió una ruta de decisión",
  "platform.ai_voice_created": "Creó una voz",
  "platform.ai_voice_updated": "Cambió una voz",
  "platform.ai_voice_reordered": "Reordenó las voces",
  "platform.ai_voice_active_changed": "Encendió o apagó una voz",
  "platform.ai_voice_preview_generated": "Generó una muestra de voz",
  // Autenticación
  "auth.login": "Inició sesión",
  "auth.login_failed": "Falló un inicio de sesión",
  "auth.logout": "Cerró sesión",
  "auth.platform_login": "Entró a la consola",
  "auth.platform_login_failed": "Falló la entrada a la consola",
  "auth.token_reuse_detected": "Se reusó una sesión robada",
  // Tenancy
  "tenancy.bypass_used": "Saltó el aislamiento de datos",
  "tenancy.impersonation_used": "Actuó en nombre de otro",
};

// ─── Zonas horarias ────────────────────────────────────────────────────────

/**
 * «Hora de Colombia» para `America/Bogota`. Sale del catálogo de países (una
 * zona por país); una zona fuera del catálogo se lee por su ciudad
 * (`America/Argentina/Buenos_Aires` → «Hora de Buenos Aires»).
 */
export function timeZoneLabel(timeZone: string | null | undefined): HumanLabel {
  const code = timeZone ?? "";
  if (!code) return { label: "", code, known: false };
  const city = (code.split("/").pop() ?? code).replace(/_/g, " ");
  const country = COUNTRIES.find((entry) => entry.timezone === code);
  if (country) return { label: `Hora de ${country.name}`, code, known: true };
  return { label: code.includes("/") ? `Hora de ${city}` : code, code, known: false };
}
