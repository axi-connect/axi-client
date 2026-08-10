import type { CampaignDTO, CampaignStatsDTO } from "../campaign";
import {
  campaignAudienceLabel,
  campaignDispatched,
  campaignPollInterval,
  campaignProgressPct,
  canCancelCampaign,
  canDeleteCampaign,
  canEditCampaign,
  canLaunchCampaign,
  canPauseCampaign,
  canResumeCampaign,
  isCampaignLive,
  isCampaignTerminal,
} from "../campaign-state";
import { CAMPAIGN_STATUS_ORDER, type CampaignStatus } from "../enums";

function stats(over: Partial<CampaignStatsDTO> = {}): CampaignStatsDTO {
  return {
    campaign_id: "c1",
    audience_total: 1200,
    pending: 260,
    queued: 15,
    sent: 200,
    delivered: 400,
    read: 300,
    failed: 25,
    skipped: 0,
    skipped_by_reason: {},
    replies: 180,
    conversions: 45,
    revenue_cents: 450_000_000,
    delivery_rate: 0.74,
    reply_rate: 0.15,
    conversion_rate: 0.037,
    ...over,
  };
}

describe("predicados de acción", () => {
  it("solo permite editar y borrar antes de lanzar", () => {
    expect(CAMPAIGN_STATUS_ORDER.filter(canEditCampaign)).toEqual(["draft", "scheduled"]);
    expect(CAMPAIGN_STATUS_ORDER.filter(canDeleteCampaign)).toEqual(["draft"]);
  });

  it("lanza solo desde borrador", () => {
    expect(CAMPAIGN_STATUS_ORDER.filter(canLaunchCampaign)).toEqual(["draft"]);
  });

  it("pausa solo lo que está enviando y reanuda solo lo pausado", () => {
    expect(CAMPAIGN_STATUS_ORDER.filter(canPauseCampaign)).toEqual(["running"]);
    expect(CAMPAIGN_STATUS_ORDER.filter(canResumeCampaign)).toEqual(["paused"]);
  });

  it("cancela todo lo que no ha terminado", () => {
    expect(CAMPAIGN_STATUS_ORDER.filter(canCancelCampaign)).toEqual([
      "draft",
      "scheduled",
      "running",
      "paused",
    ]);
  });

  it("pausar y reanudar son mutuamente excluyentes en todo estado", () => {
    for (const status of CAMPAIGN_STATUS_ORDER) {
      expect(canPauseCampaign(status) && canResumeCampaign(status)).toBe(false);
    }
  });

  it("un estado terminal no admite ninguna acción de ciclo de vida", () => {
    for (const status of CAMPAIGN_STATUS_ORDER.filter(isCampaignTerminal)) {
      expect(canEditCampaign(status)).toBe(false);
      expect(canLaunchCampaign(status)).toBe(false);
      expect(canPauseCampaign(status)).toBe(false);
      expect(canResumeCampaign(status)).toBe(false);
      expect(canCancelCampaign(status)).toBe(false);
    }
  });

  it("separa terminal de en vuelo sin solaparse", () => {
    for (const status of CAMPAIGN_STATUS_ORDER) {
      expect(isCampaignTerminal(status) && isCampaignLive(status)).toBe(false);
    }
    expect(CAMPAIGN_STATUS_ORDER.filter(isCampaignLive)).toEqual([
      "scheduled",
      "running",
      "paused",
    ]);
  });
});

describe("campaignPollInterval", () => {
  it("refresca rápido mientras envía", () => {
    expect(campaignPollInterval("running")).toBe(15_000);
  });

  it("sigue refrescando tras completarse: la entrega se reconcilia por lotes", () => {
    expect(campaignPollInterval("completed")).toBe(60_000);
  });

  it("no consulta nada cuando no hay nada que esperar", () => {
    expect(campaignPollInterval("draft")).toBe(false);
    expect(campaignPollInterval("cancelled")).toBe(false);
  });

  it("cubre todos los estados del contrato", () => {
    for (const status of CAMPAIGN_STATUS_ORDER) {
      const value = campaignPollInterval(status);
      expect(value === false || value >= 15_000).toBe(true);
    }
  });
});

describe("progreso", () => {
  it("cuenta como despachado todo lo que salió de pendiente, omitidos incluidos", () => {
    expect(campaignDispatched(stats())).toBe(940);
    expect(campaignProgressPct(stats())).toBe(78);
  });

  it("es 0 sin stats y sin audiencia, en vez de NaN", () => {
    expect(campaignProgressPct(null)).toBe(0);
    expect(campaignProgressPct(stats({ audience_total: 0, pending: 0 }))).toBe(0);
    expect(campaignDispatched(null)).toBe(0);
  });

  it("nunca pasa del 100% ni baja de 0 aunque los contadores se crucen", () => {
    expect(campaignProgressPct(stats({ audience_total: 100, pending: -50 }))).toBe(100);
    expect(campaignDispatched(stats({ audience_total: 100, pending: 300 }))).toBe(0);
  });
});

describe("campaignAudienceLabel", () => {
  const base = { id: "c1", name: "Black Friday", audience_total: 1200 } as CampaignDTO;

  it("oculta la audiencia en borrador: aún no se ha materializado", () => {
    expect(campaignAudienceLabel({ ...base, status: "draft", audience_total: 0 })).toBeNull();
  });

  it("la muestra formateada en cuanto la campaña se lanza", () => {
    for (const status of CAMPAIGN_STATUS_ORDER.filter((s: CampaignStatus) => s !== "draft")) {
      expect(campaignAudienceLabel({ ...base, status })).toBe("1.200");
    }
  });
});
