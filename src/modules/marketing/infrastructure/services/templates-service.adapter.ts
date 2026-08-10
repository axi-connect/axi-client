import { http } from "@/core/services/http";
import type {
  CreateHsmTemplateDTO,
  CreateTemplateDTO,
  HsmTemplateDTO,
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
