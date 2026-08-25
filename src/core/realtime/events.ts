/**
 * Contrato de tiempo real (Socket.IO) con el backend axi-server.
 *
 * Dos namespaces:
 * - `/inbox`    — operadores: eventos de conversación/uso/notificaciones + comandos con ack.
 * - `/channels` — administración de canales: QR de WhatsApp Web y estados (solo lectura).
 *
 * El token JWT viaja en `handshake.auth.token`. Rooms automáticos:
 * `company_{id}` (ambos ns) y `user_{id}` (`/inbox`); el room
 * `conversation_{id}` requiere `inbox.join_conversation`.
 *
 * Estos tipos son la única fuente de verdad del wire WS del frontend
 * (core no importa de modules; los slices importan de aquí).
 */
import type { Schemas } from "@/core/api/types";

// ---------------------------------------------------------------------------
// Payloads compartidos
// ---------------------------------------------------------------------------

export type ConversationStatus = Schemas["ConversationDto"]["status"];
export type ConversationMode = Schemas["ConversationDto"]["mode"];
export type ChannelStatus = Schemas["ChannelDto"]["status"];

/** Forma común de los eventos de handoff (escalated/claimed/taken_over/returned_to_ai/status_changed). */
export type ConversationHandoffEvent = {
  conversation_id: string;
  company_id: string;
  status: ConversationStatus;
  mode: ConversationMode;
  assigned_user_id: string | null;
  actor_user_id: string | null;
  note?: string;
  reason?: string;
  resolved?: boolean;
};

export type ConversationCreatedEvent = {
  conversation_id: string;
  company_id: string;
};

/**
 * Mensaje INBOUND persistido. `message` trae la vista completa (misma forma que
 * `MessageCreatedEvent`) para que el hilo abierto lo pinte sin round-trip.
 *
 * Es **opcional** a propósito: durante un despliegue escalonado un backend
 * previo emite solo el resumen. Los consumidores conservan el camino de rescate
 * (re-fetch del timeline) para ese caso — ver `use-inbox-socket`.
 */
export type MessageReceivedEvent = {
  conversation_id: string;
  message_id: string;
  company_id: string;
  content_type: Schemas["EnqueuedMessageDto"]["content_type"];
  message?: Schemas["ConversationMessagesDto"]["data"][number];
};

/**
 * F9.1: mensaje OUTBOUND persistido (queued) con la vista COMPLETA — el inbox
 * pinta en vivo replies de IA, quick actions, system y otros operadores sin
 * round-trip. `message_sent` sigue siendo la confirmación de envío real.
 */
export type MessageCreatedEvent = {
  conversation_id: string;
  company_id: string;
  message: Schemas["ConversationMessagesDto"]["data"][number];
};

export type MessageSentEvent = {
  conversation_id: string;
  message_id: string;
  company_id: string;
  content_type: Schemas["EnqueuedMessageDto"]["content_type"];
};

/**
 * Resultado de la transcripción STT (Groq/whisper) de una nota de voz.
 * `text` solo viene con `status: "done"`; el resto son metadatos opcionales.
 */
export type AudioTranscription = {
  status: "done" | "failed";
  text?: string;
  provider?: string;
  model?: string;
  audio_seconds?: number;
  latency_ms?: number;
  transcribed_at?: string;
};

/**
 * Se emite cuando la transcripción de un audio queda lista — el audio ya llegó
 * antes vía `message_received`, la transcripción unos segundos después. La UI
 * actualiza la burbuja en vivo sin re-consultar.
 */
export type MessageUpdatedEvent = {
  conversation_id: string;
  company_id: string;
  message_id: string;
  content_type: Schemas["EnqueuedMessageDto"]["content_type"];
  transcription: AudioTranscription;
};

/** F9.1: hoy el backend lo emite solo con `failed` (markFailed del outbound). */
export type MessageStatusEvent = {
  conversation_id: string;
  message_id: string;
  company_id: string;
  status: Schemas["EnqueuedMessageDto"]["status"];
  error_code?: string;
};

export type TypingEvent = {
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
};

export type IntentDetectedEvent = {
  conversation_id: string;
  company_id: string;
  intention_id: string;
  code: string;
  confidence: number;
};

export type SlaBreachedEvent = {
  conversation_id: string;
  company_id: string;
  sla_seconds: number;
  queued_at: string;
};

export type FirewallBlockedEvent = {
  company_id: string;
  conversation_id: string | null;
  contact_id: string | null;
  channel_identity_id: string | null;
  risk_score: number;
};

export type UsageUpdatedEvent = {
  company_id: string;
  metric: string;
  quantity: number;
  period_start: string;
};

export type UsageAlertEvent = {
  alert_id: string;
  company_id: string;
  usage_limit_id: string;
  metric: string;
  period: string;
  action: string;
  threshold_pct: number;
  value_at_trigger: number;
  limit_value: number;
  period_start: string;
};

export type NotificationCreatedEvent = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: unknown;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Analíticas (F13) — namespace /inbox, rooms company_{id} automáticos
// ---------------------------------------------------------------------------

/** Alerta de anomalía disparada (floating-alert en vivo + badge/banner). */
export type AnalyticsAlertEvent = {
  company_id: string;
  rule: string;
  subject_type: string;
  subject_id: string | null;
  value: number;
  threshold: number;
  window_start: string;
  /** Extras por regla; `conversation_id` presente cuando aplica (deep-link). */
  [key: string]: unknown;
};

/**
 * Evaluación LLM-judge completada (también al room `conversation_{id}`).
 * Cierra el loop de "Volver a evaluar" y refresca el tab Calidad.
 */
export type AnalyticsEvaluationCompletedEvent = {
  company_id: string;
  conversation_id: string;
  ai_agent_id: string | null;
  overall_score: number | null;
  hallucination_severity: string | null;
};

// ---------------------------------------------------------------------------
// Pedidos (F11) — payload resumen SIN items/payments: al recibir un evento,
// el panel re-consulta GET /orders/:id si necesita el detalle.
// ---------------------------------------------------------------------------

export type OrderStatus = Schemas["OrderDto"]["status"];

export type OrderRealtimeSummary = {
  company_id: string;
  order_id: string;
  order_number: number | null;
  /** null en pedidos manuales sin conversación */
  conversation_id: string | null;
  contact_id: string;
  status: OrderStatus;
  total_cents: number;
  currency: string;
  created_by_type: "user" | "ai_agent";
};

/** El pedido sale de draft (lo tomó la IA o lo creó el operador). */
export type OrderCreatedEvent = OrderRealtimeSummary;

/** confirm / cancel / fulfill / verify / reject de pago. */
export type OrderStatusChangedEvent = OrderRealtimeSummary & {
  previous_status: OrderStatus;
  notification_key?: "confirmed" | "paid" | "fulfilled" | "cancelled" | "payment_rejected";
  notify_customer?: boolean;
};

/** Comprobante/reporte de pago (IA o manual). */
export type OrderPaymentReportedEvent = OrderRealtimeSummary & { payment_id: string };

/** Edición de items/notas/descuento en draft|pending. */
export type OrderUpdatedEvent = OrderRealtimeSummary;

// ---------------------------------------------------------------------------
// CRM (F0) — deals/actividades/imports en vivo. Rooms company_{id} (+
// conversation_{id} si el deal nació de una conversación). `crm.task_due` NO
// viaja por WS: llega solo como notification.created (campanita).
// Payloads espejo de axi-server src/modules/crm/application/crm_events.ts.
// ---------------------------------------------------------------------------

export type DealStatus = Schemas["DealDto"]["status"];
export type DealSource = Schemas["DealDto"]["source"];
export type ActivityKind = Schemas["ActivityDto"]["kind"];
export type TaskStatus = Schemas["ActivityDto"]["task_status"];

/** Payload base de todos los `crm.deal_*` (sin contact/stage embebidos: si la
 * vista necesita el detalle completo, re-consulta GET /crm/deals/:id). */
export type CrmDealRealtimeSummary = {
  company_id: string;
  deal_id: string;
  contact_id: string;
  pipeline_id: string;
  stage_id: string;
  title: string;
  status: DealStatus;
  value_cents: number | null;
  currency: string;
  owner_user_id: string | null;
  conversation_id: string | null;
  order_id: string | null;
  source: DealSource;
  created_by_type: Schemas["DealDto"]["created_by_type"];
};

/** Manual, tool IA `open_deal` o automatización order→deal (ver `source`). */
export type CrmDealCreatedEvent = CrmDealRealtimeSummary;

/** PATCH de campos / reopen: kanban y detalle refrescan sin round-trip. */
export type CrmDealUpdatedEvent = CrmDealRealtimeSummary;

/** POST /crm/deals/:id/move (drag del kanban). */
export type CrmDealStageChangedEvent = CrmDealRealtimeSummary & { from_stage_id: string };

export type CrmDealWonEvent = CrmDealRealtimeSummary;

export type CrmDealLostEvent = CrmDealRealtimeSummary & { lost_reason: string | null };

/** Sweep horario: deal sin moverse más de `rotting_days` de su etapa. */
export type CrmDealStalledEvent = CrmDealRealtimeSummary & { stalled_days: number };

/** Payload común de actividad/tarea (operador o IA). */
export type CrmActivityRealtimeSummary = {
  company_id: string;
  activity_id: string;
  contact_id: string;
  deal_id: string | null;
  conversation_id: string | null;
  kind: ActivityKind;
  title: string | null;
  due_at: string | null;
  assigned_user_id: string | null;
  task_status: TaskStatus;
  created_by_type: Schemas["ActivityDto"]["created_by_type"];
  created_by_user_id: string | null;
};

export type CrmActivityCreatedEvent = CrmActivityRealtimeSummary;

export type CrmTaskCompletedEvent = CrmActivityRealtimeSummary;

/** Fin del import CSV (éxito o fallo); con `failed` solo llegan los básicos. */
export type CrmImportCompletedEvent = {
  company_id: string;
  import_job_id: string;
  status: "completed" | "failed";
  created_by_user_id: string | null;
  error_count: number;
  total_rows?: number;
  created_count?: number;
  updated_count?: number;
  skipped_count?: number;
};

/** Promoción prospect→lead→customer (server-side, p.ej. al ganar un deal). */
export type ContactLifecycleChangedEvent = {
  company_id: string;
  contact_id: string;
  lifecycle_stage: Schemas["ContactDto"]["lifecycle_stage"];
};

/** Merge de duplicados: quitar al perdedor (`merged_contact_id`) de listados. */
export type ContactMergedEvent = {
  company_id: string;
  contact_id: string;
  merged_contact_id: string;
};

// ---------------------------------------------------------------------------
// Marketing — payloads espejo de axi-server
// src/modules/marketing/application/marketing_events.ts
//
// Los seis llevan `simulated`: el router WS ya corta los simulados antes de
// emitir, pero el flag viaja en el payload y el cliente lo ignora igual que el
// resto de familias. Ningún payload trae colecciones anidadas: si la vista
// necesita el detalle, re-consulta REST (misma regla que `crm.deal_*`).
// ---------------------------------------------------------------------------

export type CampaignStatus = Schemas["CampaignDto"]["status"];
export type AutomationTriggerType = Schemas["AutomationDto"]["trigger_type"];
export type OptOutSource = Schemas["OptOutsListDto"]["data"][number]["source"];

/** Toda transición de campaña: launch, pause, resume, cancel, completed y el
 * paso scheduled→running que hace el sweep. */
export type MarketingCampaignStatusChangedEvent = {
  company_id: string;
  campaign_id: string;
  status: CampaignStatus;
  simulated: boolean;
};

/** Fin del fan-out. `pending` es lo que queda por despachar, no el total. */
export type MarketingCampaignProgressEvent = {
  company_id: string;
  campaign_id: string;
  audience_total: number;
  pending: number;
  simulated: boolean;
};

/** Cada decisión de una regla de recuperación: envió o descartó, con motivo. */
export type MarketingAutomationTriggeredEvent = {
  company_id: string;
  automation_id: string;
  execution_id: string;
  contact_id: string;
  conversation_id: string | null;
  trigger_type: AutomationTriggerType;
  status: "sent" | "skipped";
  skip_reason: string | null;
  simulated: boolean;
};

/** Baja registrada: por keyword del cliente o alta manual del operador. */
export type MarketingOptOutCreatedEvent = {
  company_id: string;
  opt_out_id: string;
  contact_id: string;
  conversation_id: string | null;
  source: OptOutSource;
  keyword_text: string | null;
  simulated: boolean;
};

/**
 * Axel, el director de mercadeo (módulo cmo). El briefing del día quedó listo.
 *
 * `proposals_created` es lo que alimenta el badge del sidebar, y `headline` lo
 * que hace que la notificación diga algo: un aviso de "tienes un informe nuevo"
 * se ignora a la segunda vez.
 */
export type CmoBriefingReadyEvent = {
  company_id: string;
  briefing_id: string;
  /** Día LOCAL del negocio (YYYY-MM-DD), no un instante UTC. */
  date_local: string;
  proposals_created: number;
  headline: string;
};

/** Axel dejó una propuesta nueva: el tablero la inserta sin recargar. */
export type CmoProposalCreatedEvent = {
  company_id: string;
  proposal_id: string;
  kind: string;
  title: string;
  source: "briefing" | "signal" | "chat";
  expires_at: string | null;
};

/**
 * Una propuesta se decidió. Llega también cuando la decidió OTRA pestaña o
 * OTRO usuario: es lo que evita que dos personas aprueben la misma campaña
 * mirando dos pantallas distintas.
 */
export type CmoProposalDecidedEvent = {
  company_id: string;
  proposal_id: string;
  status: "approved" | "rejected" | "expired" | "superseded";
  decided_by_user_id: string | null;
};

/**
 * El turno de Axel, contado mientras ocurre (sala `user_{id}`).
 *
 * Aquí el WS **sí sincroniza**, y es la excepción declarada al «el WS avisa, no
 * sincroniza» del resto del módulo: no hay ningún endpoint del que releer un
 * turno a medio escribir. La verdad final sigue siendo el cuerpo del POST — o el
 * `cmo.turn_completed`, que la trae ya persistida cuando la conexión se cortó.
 *
 * Campos comunes a los cinco: `turn_id` ata los eventos a la petición (el
 * cliente lo propone antes de enviarla, porque los eventos llegan en el primer
 * segundo y la respuesta puede tardar noventa) y `seq` da el orden, para
 * descartar lo repetido y lo que llegue tarde.
 */
/**
 * La forma de la pregunta con opciones, replicada aquí a propósito.
 *
 * `core/` no importa de `modules/` (arquitectura §3.3 regla 7), así que este
 * archivo no puede tomar `CmoQuestionDTO` del slice. La forma es la del contrato
 * y el que manda sigue siendo el OpenAPI: el store del CMO usa el tipo generado
 * y esto solo tipa el sobre del socket.
 */
type CmoQuestionDTO = {
  question: string;
  options: { label: string; hint: string | null }[];
  allow_free_text: boolean;
};

type CmoTurnEventBase = {
  company_id: string;
  thread_id: string;
  turn_id: string;
  seq: number;
};

export type CmoTurnStartedEvent = CmoTurnEventBase;

/** Una herramienta de Axel arrancó o terminó. La etiqueta la escribe el servidor. */
export type CmoTurnStepEvent = CmoTurnEventBase & {
  name: string;
  label: string;
  state: "running" | "done";
  ms: number | null;
  productive: boolean | null;
};

/**
 * Texto de la respuesta, ya COALESCIDO en el servidor (no un evento por token).
 *
 * `iteration` es la vuelta del loop de la que sale: si el modelo escribió algo
 * antes de llamar a una herramienta, ese texto era un preámbulo y no la
 * respuesta, así que al ver una iteración mayor hay que descartar lo acumulado.
 */
export type CmoTurnDeltaEvent = CmoTurnEventBase & {
  iteration: number;
  text: string;
};

/** El turno cerró y ya está PERSISTIDO: esto rescata la respuesta si el POST murió. */
export type CmoTurnCompletedEvent = CmoTurnEventBase & {
  message_id: string;
  body: string;
  proposal_id: string | null;
  tool_calls: number;
  /**
   * La pregunta con opciones que Axel dejó abierta, o `null`.
   *
   * Viaja DENTRO del cierre y no en un evento propio porque solo existe al
   * terminar el turno: un `cmo.turn_question` sería un segundo camino hacia el
   * mismo hecho. Y tiene que venir aquí — un turno rescatado por WS (el POST se
   * cortó) pintaría la pregunta sin sus botones si no.
   *
   * Cuando no es `null`, `body` puede llegar vacío: la pregunta ES el mensaje.
   */
  question: CmoQuestionDTO | null;
};

/** El turno falló. `code` es el del error tipado del backend. */
export type CmoTurnFailedEvent = CmoTurnEventBase & {
  code: string;
};

/** Cupón aplicado a un pedido (el total del pedido cambia: llega `order.updated`). */
export type MarketingPromotionRedeemedEvent = {
  company_id: string;
  promotion_id: string;
  redemption_id: string;
  contact_id: string;
  order_id: string;
  amount_applied_cents: number;
  simulated: boolean;
};

/** El pedido se canceló y la redención se revirtió. */
export type MarketingPromotionRevertedEvent = {
  company_id: string;
  promotion_id: string;
  redemption_id: string;
  contact_id: string;
  order_id: string;
  simulated: boolean;
};

export type ChannelQrCodeEvent = {
  channel_id: string;
  company_id: string;
  qr: string | null;
  /** Data URL lista para `<img src>`; puede venir null si solo hay pairing code. */
  qr_image: string | null;
  pairing_code: string | null;
};

export type ChannelStatusChangedEvent = {
  channel_id: string;
  company_id: string;
  status: ChannelStatus;
  phone_number?: string | null;
};

export type ChannelSessionFailedEvent = {
  channel_id: string;
  company_id: string;
  reason: string;
};

/**
 * F15: la empresa fue suspendida — llega a `/inbox` Y `/channels`, seguido de
 * la desconexión forzada de los sockets desde el server. El cliente debe
 * mostrar la pantalla bloqueante y NO reintentar la reconexión.
 */
export type CompanySuspendedEvent = {
  company_id: string;
  previous: string;
  current: string;
  reason?: string;
};

// ---------------------------------------------------------------------------
// Eventos server → client
// ---------------------------------------------------------------------------

/** Namespace `/inbox`. Incluye usage.* y notification.* (base para módulos futuros). */
export type InboxServerEvents = {
  "conversation.created": (payload: ConversationCreatedEvent) => void;
  "conversation.message_received": (payload: MessageReceivedEvent) => void;
  "conversation.message_created": (payload: MessageCreatedEvent) => void;
  "conversation.message_updated": (payload: MessageUpdatedEvent) => void;
  "conversation.message_sent": (payload: MessageSentEvent) => void;
  "conversation.message_status": (payload: MessageStatusEvent) => void;
  "conversation.typing": (payload: TypingEvent) => void;
  "conversation.intent_detected": (payload: IntentDetectedEvent) => void;
  "conversation.escalated": (payload: ConversationHandoffEvent) => void;
  "conversation.claimed": (payload: ConversationHandoffEvent) => void;
  "conversation.taken_over": (payload: ConversationHandoffEvent) => void;
  "conversation.returned_to_ai": (payload: ConversationHandoffEvent) => void;
  "conversation.status_changed": (payload: ConversationHandoffEvent) => void;
  "conversation.sla_breached": (payload: SlaBreachedEvent) => void;
  "firewall.blocked": (payload: FirewallBlockedEvent) => void;
  "order.created": (payload: OrderCreatedEvent) => void;
  "order.status_changed": (payload: OrderStatusChangedEvent) => void;
  "order.payment_reported": (payload: OrderPaymentReportedEvent) => void;
  "order.updated": (payload: OrderUpdatedEvent) => void;
  "crm.deal_created": (payload: CrmDealCreatedEvent) => void;
  "crm.deal_updated": (payload: CrmDealUpdatedEvent) => void;
  "crm.deal_stage_changed": (payload: CrmDealStageChangedEvent) => void;
  "crm.deal_won": (payload: CrmDealWonEvent) => void;
  "crm.deal_lost": (payload: CrmDealLostEvent) => void;
  "crm.deal_stalled": (payload: CrmDealStalledEvent) => void;
  "crm.activity_created": (payload: CrmActivityCreatedEvent) => void;
  "crm.task_completed": (payload: CrmTaskCompletedEvent) => void;
  "crm.import_completed": (payload: CrmImportCompletedEvent) => void;
  "contact.lifecycle_changed": (payload: ContactLifecycleChangedEvent) => void;
  "contact.merged": (payload: ContactMergedEvent) => void;
  "marketing.campaign_status_changed": (
    payload: MarketingCampaignStatusChangedEvent,
  ) => void;
  "marketing.campaign_progress": (payload: MarketingCampaignProgressEvent) => void;
  "marketing.automation_triggered": (payload: MarketingAutomationTriggeredEvent) => void;
  "marketing.opt_out_created": (payload: MarketingOptOutCreatedEvent) => void;
  "marketing.promotion_redeemed": (payload: MarketingPromotionRedeemedEvent) => void;
  "marketing.promotion_reverted": (payload: MarketingPromotionRevertedEvent) => void;
  "cmo.briefing_ready": (payload: CmoBriefingReadyEvent) => void;
  "cmo.proposal_created": (payload: CmoProposalCreatedEvent) => void;
  "cmo.proposal_decided": (payload: CmoProposalDecidedEvent) => void;
  "cmo.turn_started": (payload: CmoTurnStartedEvent) => void;
  "cmo.turn_step": (payload: CmoTurnStepEvent) => void;
  "cmo.turn_delta": (payload: CmoTurnDeltaEvent) => void;
  "cmo.turn_completed": (payload: CmoTurnCompletedEvent) => void;
  "cmo.turn_failed": (payload: CmoTurnFailedEvent) => void;
  "usage.updated": (payload: UsageUpdatedEvent) => void;
  "usage.alert": (payload: UsageAlertEvent) => void;
  "analytics.alert": (payload: AnalyticsAlertEvent) => void;
  "analytics.evaluation_completed": (payload: AnalyticsEvaluationCompletedEvent) => void;
  "notification.created": (payload: NotificationCreatedEvent) => void;
  "company.suspended": (payload: CompanySuspendedEvent) => void;
};

/** Namespace `/channels` — solo lectura (sin comandos). */
export type ChannelsServerEvents = {
  "channel.qr_code": (payload: ChannelQrCodeEvent) => void;
  "channel.status_changed": (payload: ChannelStatusChangedEvent) => void;
  "channel.session_failed": (payload: ChannelSessionFailedEvent) => void;
  "company.suspended": (payload: CompanySuspendedEvent) => void;
};

// ---------------------------------------------------------------------------
// Comandos client → server (namespace /inbox) con ack tipado
// ---------------------------------------------------------------------------

/** Ack estándar de todo comando. Un error de negocio jamás desconecta el socket. */
export type WsAck<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export type JoinConversationPayload = { conversation_id: string };
export type ClaimPayload = { conversation_id: string };
export type ReturnToAiPayload = { conversation_id: string; note?: string };
export type CloseConversationPayload = {
  conversation_id: string;
  resolved?: boolean;
  reason?: string;
};
export type SendMessagePayload = { conversation_id: string } & Schemas["SendMessageDto"];
export type TypingPayload = { conversation_id: string; is_typing: boolean };

export type InboxCommands = {
  "inbox.join_conversation": (
    payload: JoinConversationPayload,
    ack: (res: WsAck) => void,
  ) => void;
  "inbox.leave_conversation": (
    payload: JoinConversationPayload,
    ack: (res: WsAck<null>) => void,
  ) => void;
  "inbox.claim": (
    payload: ClaimPayload,
    ack: (res: WsAck<Schemas["ConversationDto"]>) => void,
  ) => void;
  "inbox.takeover": (
    payload: ClaimPayload,
    ack: (res: WsAck<Schemas["ConversationDto"]>) => void,
  ) => void;
  "inbox.return_to_ai": (
    payload: ReturnToAiPayload,
    ack: (res: WsAck<Schemas["ConversationDto"]>) => void,
  ) => void;
  "inbox.close": (
    payload: CloseConversationPayload,
    ack: (res: WsAck<Schemas["ConversationDto"]>) => void,
  ) => void;
  "inbox.send_message": (
    payload: SendMessagePayload,
    ack: (res: WsAck<Schemas["EnqueuedMessageDto"]>) => void,
  ) => void;
  "inbox.mark_read": (
    payload: JoinConversationPayload,
    ack: (res: WsAck<null>) => void,
  ) => void;
  "inbox.typing": (payload: TypingPayload, ack: (res: WsAck<null>) => void) => void;
};

/** `/channels` no acepta comandos. */
export type ChannelsCommands = Record<string, never>;

// ---------------------------------------------------------------------------
// Mapa de namespaces
// ---------------------------------------------------------------------------

export const REALTIME_NAMESPACES = {
  inbox: "inbox",
  channels: "channels",
} as const;

export type RealtimeNamespace = (typeof REALTIME_NAMESPACES)[keyof typeof REALTIME_NAMESPACES];

export type ServerEventsOf<N extends RealtimeNamespace> = N extends "inbox"
  ? InboxServerEvents
  : ChannelsServerEvents;

export type ClientEventsOf<N extends RealtimeNamespace> = N extends "inbox"
  ? InboxCommands
  : ChannelsCommands;
