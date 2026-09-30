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
  rne: "Está inscrito en el Registro de No Excluidos",
  needs_opt_in: "Este canal exige autorización previa y el contacto no la ha dado",
  channel_disabled: "Este canal está apagado en la política de contacto",
  outside_hours: "Fuera del horario prudente; sale en la siguiente franja",
} as const;
