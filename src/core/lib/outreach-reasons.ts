/**
 * Por qué la política de contacto (OUTREACH_POLICY del servidor) frenó un
 * envío comercial. Las comparten las corridas de tareas del CRM, los
 * destinatarios de campañas y las ejecuciones de automatizaciones: un solo
 * mapa para que la misma razón no se lea distinto en cada pantalla.
 * `opted_out` y `daily_cap` no están aquí porque cada módulo ya los nombra
 * con su propio matiz.
 */
export const OUTREACH_BLOCK_REASON_LABELS = {
  habeas_data: "El titular pidió eliminar o no usar sus datos (habeas data)",
  suppressed: "Está en la lista de supresión: no se le contacta",
  rne: "Está inscrito en el Registro de Números Excluidos (RNE)",
  needs_opt_in: "Este canal exige autorización previa y el contacto no la ha dado",
  channel_disabled: "Este canal está apagado en la política de contacto",
  outside_hours: "Fuera del horario prudente; sale en la siguiente franja",
  // Frenos del frío controlado (WhatsApp y SMS a quien no dio permiso)
  cold_not_mobile: "En frío solo se escribe a celulares, y este número no lo es",
  cold_already_touched: "Ya recibió su mensaje en frío por este canal y no ha respondido",
  cold_daily_cap: "Se gastaron los mensajes en frío de hoy; sale en el próximo día hábil",
  cold_template_required:
    "En frío por WhatsApp hace falta una plantilla de marketing aprobada con botón de baja",
  cold_quality_paused: "El WhatsApp en frío está en pausa por la calidad del número",
} as const;
