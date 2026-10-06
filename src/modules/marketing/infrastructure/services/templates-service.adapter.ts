import { http } from "@/core/services/http";
import type {
  CreateHsmTemplateDTO,
  UpdateHsmTemplateDTO,
  CreateTemplateDTO,
  HsmHeaderMediaUploadDTO,
  HsmLibraryTemplateDTO,
  HsmTemplateDTO,
  MessagingWindowDTO,
  TemplateDTO,
  UpdateTemplateDTO,
} from "@/modules/marketing/domain/template-catalog";
import type {
  TemplateCategoryReview,
  TemplateDraftTextDTO,
  UtilityRewrite,
} from "@/modules/marketing/domain/template-category-review";

/**
 * Plantillas del tenant (`/marketing/templates`) y plantillas de Meta
 * (`/marketing/hsm-templates`).
 *
 * Ninguno de los dos listados pagina ni busca: devuelven la colección completa
 * y el filtrado va en cliente. `hsm-templates` exige `channel_id` — las
 * plantillas viven en la WABA del canal, no en el tenant.
 */

export async function listTemplates(): Promise<TemplateDTO[]> {
  const res = await http.get<{ data: TemplateDTO[] }>("/marketing/templates");
  return res.data;
}

export function createTemplate(dto: CreateTemplateDTO): Promise<TemplateDTO> {
  return http.post<TemplateDTO>("/marketing/templates", dto);
}

export function updateTemplate(id: string, dto: UpdateTemplateDTO): Promise<TemplateDTO> {
  return http.patch<TemplateDTO>(`/marketing/templates/${id}`, dto);
}

export function deleteTemplate(id: string): Promise<void> {
  return http.delete<void>(`/marketing/templates/${id}`);
}

/**
 * Edita y reenvía a aprobación. NO lleva nombre ni idioma: Meta no los deja
 * cambiar. La categoría solo si la plantilla no está aprobada.
 */
export function updateHsmTemplate(
  templateId: string,
  input: UpdateHsmTemplateDTO,
): Promise<HsmTemplateDTO> {
  return http.patch<HsmTemplateDTO>(`/marketing/hsm-templates/${templateId}`, input);
}

/** Borra en Meta y en la base. Borrar una aprobada bloquea su nombre 30 días. */
export function deleteHsmTemplate(templateId: string): Promise<void> {
  return http.delete<void>(`/marketing/hsm-templates/${templateId}`);
}

/**
 * El cupo de conversaciones nuevas que Meta deja abrir en 24 h, del portafolio
 * entero. `limit: null` = sin tope conocido; NO es cero.
 */
export function getMessagingWindow(channelId: string): Promise<MessagingWindowDTO> {
  return http.get<MessagingWindowDTO>("/marketing/hsm-templates/messaging-window", {
    channel_id: channelId,
  });
}

export async function listHsmTemplates(params: {
  channel_id: string;
  category?: HsmTemplateDTO["category"];
  approval_status?: HsmTemplateDTO["approval_status"];
}): Promise<HsmTemplateDTO[]> {
  const res = await http.get<{ data: HsmTemplateDTO[] }>("/marketing/hsm-templates", {
    ...params,
  });
  return res.data;
}

/** Pull desde Meta. 502 `channels/template_sync_failed` con el detalle de Meta. */
export function syncHsmTemplates(
  channelId: string,
): Promise<{ synced: number; removed?: number; media_pending?: number }> {
  // `removed` llega desde el servidor que retira lo que Meta ya no lista; uno viejo no lo manda.
  // `media_pending`: imágenes del Business Manager que no cupieron en el tope de este sync.
  return http.post<{ synced: number; removed?: number; media_pending?: number }>("/marketing/hsm-templates/sync", {
    channel_id: channelId,
  });
}

/**
 * Crea la plantilla EN META: queda `pending` hasta que Meta la apruebe. Con
 * `library_template_name` se crea desde la biblioteca de Meta y, si el texto
 * fijo no cambió, vuelve ya aprobada.
 */
export function createHsmTemplate(dto: CreateHsmTemplateDTO): Promise<HsmTemplateDTO> {
  return http.post<HsmTemplateDTO>("/marketing/hsm-templates", dto);
}

/**
 * La biblioteca de plantillas de Meta para la WABA del canal (hsm-media F5):
 * unas 170 de utilidad en `es`, sin las que traen botones que axi no maneja.
 * `search` filtra en el servidor; la página filtra en cliente y no lo usa.
 */
export async function listHsmLibrary(channelId: string, search?: string): Promise<HsmLibraryTemplateDTO[]> {
  const res = await http.get<{ data: HsmLibraryTemplateDTO[] }>("/marketing/hsm-templates/library", {
    channel_id: channelId,
    ...(search !== undefined && search.trim() !== "" ? { search: search.trim() } : {}),
  });
  return res.data;
}

/**
 * Sube el archivo de la cabecera (hsm-media F4): el servidor guarda la copia de
 * axi —la que se reenvía en cada envío— y lo sube a Meta para el ejemplo de la
 * revisión. Devuelve las dos cosas para mandarlas luego con la plantilla.
 * Multipart: `http` no fija `Content-Type` y el navegador pone el boundary.
 */
export function uploadHsmHeaderMedia(channelId: string, file: File): Promise<HsmHeaderMediaUploadDTO> {
  const form = new FormData();
  form.append("channel_id", channelId);
  form.append("file", file);
  return http.post<HsmHeaderMediaUploadDTO>("/marketing/hsm-templates/media", form);
}

/**
 * Jev revisa el borrador (hotfix 131049): categoría con probabilidad y las
 * frases que lo vuelven marketing. Responde siempre (sin Jev, con las reglas
 * de Meta). `signal` aborta la revisión vieja cuando el texto cambia.
 */
export function reviewTemplateCategory(
  draft: TemplateDraftTextDTO,
  signal?: AbortSignal,
): Promise<TemplateCategoryReview> {
  return http.post<TemplateCategoryReview>("/marketing/hsm-templates/category-review", draft, { signal });
}

/** «Proponer versión de utilidad»: solo a pedido. `null` = no hubo una versión que Meta aceptaría. */
export async function proposeUtilityRewrite(draft: TemplateDraftTextDTO): Promise<UtilityRewrite | null> {
  const res = await http.post<{ proposal: UtilityRewrite | null }>("/marketing/hsm-templates/utility-rewrite", draft);
  return res.proposal;
}
