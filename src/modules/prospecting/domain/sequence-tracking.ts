import type { Schemas } from "@/core/api/types"

/**
 * «Seguimiento» de una secuencia (lote 1, mockups aprobados por Cristian el
 * 23-nov): qué salió, qué llegó, respuestas, rebotes, quejas y aperturas, por
 * negocio y por canal, filtrable por búsqueda. Aquí van los textos y las
 * reglas puras; el servidor manda estados.
 */
export type SequenceTrackingDTO = Schemas["SequenceTrackingDto"]
export type TrackingRowDTO = SequenceTrackingDTO["rows"][number]
export type WhatsappCellDTO = NonNullable<TrackingRowDTO["whatsapp"]>
export type EmailCellDTO = NonNullable<TrackingRowDTO["email"]>
export type ClearUndeliveredResultDTO = Schemas["ClearUndeliveredResultDto"]

export type Tone = "good" | "bad" | "wait" | "plain"

export const WHATSAPP_STATE: Record<WhatsappCellDTO["state"], { label: string; tone: Tone; step: number }> = {
  scheduled: { label: "Programado", tone: "wait", step: 0 },
  sent: { label: "Enviado", tone: "plain", step: 1 },
  delivered: { label: "Entregado", tone: "plain", step: 2 },
  read: { label: "Leído", tone: "good", step: 3 },
  replied: { label: "Respondió", tone: "good", step: 4 },
  failed: { label: "No llegó", tone: "bad", step: 1 },
  skipped: { label: "No salió", tone: "wait", step: 0 },
}

export const EMAIL_STATE: Record<EmailCellDTO["state"], { label: string; tone: Tone; step: number }> = {
  scheduled: { label: "Programado", tone: "wait", step: 0 },
  sent: { label: "Enviado", tone: "plain", step: 1 },
  delivered: { label: "Entregado", tone: "plain", step: 2 },
  replied: { label: "Respondió", tone: "good", step: 4 },
  bounced: { label: "Rebotó", tone: "bad", step: 1 },
  complained: { label: "Lo marcó como spam", tone: "bad", step: 2 },
  failed: { label: "No salió", tone: "bad", step: 1 },
  skipped: { label: "No salió", tone: "wait", step: 0 },
}

/** Cómo se dice el toque que sigue. */
export const MEDIUM_LABEL: Record<string, string> = {
  message: "WhatsApp",
  call: "Llamada",
  call_then_message: "Llamada",
  email: "Correo",
  sms: "SMS",
  manual: "Tarea manual",
}

export const STOP_LABEL: Record<string, string> = {
  replied: "Parada: respondió",
  converted: "Parada: compró",
  opted_out: "Parada: se dio de baja",
  not_interested: "Parada: no le interesa",
  stopped_by_user: "Parada por el equipo",
  task_cancelled: "Parada: el paso no pudo salir",
}

export type TrackingFilter = "all" | "replied" | "interest" | "failed" | "ongoing"

export const FILTER_LABEL: Record<TrackingFilter, string> = {
  all: "Todos",
  replied: "Respondieron",
  interest: "Con interés",
  failed: "No llegó",
  ongoing: "En curso",
}

/** Con interés: abrió o dio clic al correo, o leyó el WhatsApp, y aún no respondió. */
function showsInterest(row: TrackingRowDTO): boolean {
  if (row.replied) return false
  return row.whatsapp?.state === "read" || row.email?.opened_at != null || row.email?.clicked_at != null
}

function didNotArrive(row: TrackingRowDTO): boolean {
  return (
    row.whatsapp?.state === "failed" ||
    row.email?.state === "bounced" ||
    row.email?.state === "complained" ||
    row.email?.state === "failed"
  )
}

export function matchesFilter(row: TrackingRowDTO, filter: TrackingFilter): boolean {
  switch (filter) {
    case "all":
      return true
    case "replied":
      return row.replied
    case "interest":
      return showsInterest(row)
    case "failed":
      return didNotArrive(row)
    case "ongoing":
      return row.sequence.status === "active" && !row.replied
  }
}

export function matchesQuery(row: TrackingRowDTO, query: string): boolean {
  const needle = fold(query)
  if (needle === "") return true
  return fold(`${row.name} ${row.category ?? ""} ${row.city ?? ""}`).includes(needle)
}

function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
}

/** «Clínica estética · Bogotá», sin piezas vacías. */
export function rowSubtitle(row: TrackingRowDTO): string {
  return [row.category, row.city].filter((part): part is string => part !== null && part.trim() !== "").join(" · ")
}

/** La línea de debajo del estado del WhatsApp: el motivo, o cuándo pasó. */
export function whatsappWhy(cell: WhatsappCellDTO, when: (iso: string) => string): string {
  if (cell.state === "failed" || cell.state === "skipped") return sentence(cell.detail ?? "No llegó")
  if (cell.state === "scheduled") return `Sale ${when(cell.at)}`
  return when(cell.at)
}

/** La línea de debajo del estado del correo: apertura y clic, o el motivo. */
export function emailWhy(cell: EmailCellDTO, when: (iso: string) => string): string {
  if (cell.state === "bounced") return "La dirección no recibe correo: no se le vuelve a escribir"
  if (cell.state === "complained") return "Se suprime: no se le vuelve a escribir"
  if (cell.state === "failed" || cell.state === "skipped") return sentence(cell.detail ?? "No salió")
  if (cell.state === "scheduled") return `Sale ${when(cell.at)}`
  if (cell.click_count > 0) return `Abrió y dio clic · ${when(cell.clicked_at ?? cell.at)}`
  if (cell.open_count > 1) return `Abrió ${String(cell.open_count)} veces · ${when(cell.opened_at ?? cell.at)}`
  if (cell.open_count === 1) return `Abrió · ${when(cell.opened_at ?? cell.at)}`
  return cell.state === "delivered" ? "Sin abrir" : when(cell.at)
}

/** Una frase: primera en mayúscula y sin punto final (va en una línea corta). */
export function sentence(text: string): string {
  const trimmed = text.trim()
  const capital = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  return /[.!?]$/.test(capital) ? capital.slice(0, -1) : capital
}

/** La columna de la secuencia: en qué paso va y qué sigue (o por qué paró). */
export function sequenceLine(row: TrackingRowDTO, when: (iso: string) => string): { main: string; sub: string } {
  const { sequence } = row
  const main =
    sequence.status === "stopped"
      ? (STOP_LABEL[sequence.stop_reason ?? ""] ?? "Parada")
      : sequence.status === "completed"
        ? "Completada"
        : `Paso ${String(Math.max(sequence.current_position, 1))} de ${String(sequence.steps)}`
  const sub =
    sequence.next !== null
      ? `${MEDIUM_LABEL[sequence.next.medium] ?? "Siguiente toque"} · ${when(sequence.next.at)}`
      : sequence.status === "completed"
        ? "Sin respuesta"
        : ""
  return { main, sub }
}

/** Puntos de avance: cuántos de 4 (salió · entregado · leído/abrió · respondió). */
export function pips(step: number, failed: boolean): ("on" | "x" | "off")[] {
  return [0, 1, 2, 3].map((index) => {
    if (failed) return index === 0 ? "x" : "off"
    return index < step ? "on" : "off"
  })
}
