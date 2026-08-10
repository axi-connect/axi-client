import type { Schemas } from "@/core/api/types";
import type { CampaignStatus } from "./enums";

/** Contratos de campañas (`/marketing/campaigns`). */

export type CampaignDTO = Schemas["CampaignDto"];
export type CreateCampaignDTO = Schemas["CreateCampaignDto"];
export type UpdateCampaignDTO = Schemas["UpdateCampaignDto"];
export type CampaignStatsDTO = Schemas["CampaignStatsDto"];
export type AudiencePreviewDTO = Schemas["AudiencePreviewDto"];
export type CampaignRecipientDTO =
  Schemas["CampaignRecipientsListDto"]["data"][number];

/** Filtros del listado. No hay búsqueda por texto en el backend (KB §2.3). */
export type ListCampaignsParams = {
  status?: CampaignStatus;
  page?: number;
  page_size?: number;
};

export type ListRecipientsParams = {
  status?: CampaignRecipientDTO["status"];
  page?: number;
  page_size?: number;
};

/** Campaña + sus stats, para las vistas que muestran ambas cosas juntas. */
export type CampaignWithStats = {
  campaign: CampaignDTO;
  stats: CampaignStatsDTO | null;
};
