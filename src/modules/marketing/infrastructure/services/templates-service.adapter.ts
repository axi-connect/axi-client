import { http } from "@/core/services/http";
import type {
  CreateHsmTemplateDTO,
  CreateTemplateDTO,
  HsmTemplateDTO,
  MessagingWindowDTO,
  TemplateDTO,
  UpdateTemplateDTO,
} from "@/modules/marketing/domain/template-catalog";

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
  input: { body: string; examples?: string[]; category?: HsmTemplateDTO["category"] },
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
export function syncHsmTemplates(channelId: string): Promise<{ synced: number }> {
  return http.post<{ synced: number }>("/marketing/hsm-templates/sync", {
    channel_id: channelId,
  });
}

/** Crea la plantilla EN META: queda `pending` hasta que Meta la apruebe. */
export function createHsmTemplate(dto: CreateHsmTemplateDTO): Promise<HsmTemplateDTO> {
  return http.post<HsmTemplateDTO>("/marketing/hsm-templates", dto);
}
