import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type {
  CampaignDTO,
  CampaignRecipientDTO,
  CampaignStatsDTO,
} from "@/modules/marketing/domain/campaign";
import { CampaignDetailView } from "../CampaignDetailView";

/**
 * Agrupados POR ESCENARIO (ver la cabecera de `PromotionsView.test.tsx`).
 *
 * Lo que se comprueba aquí es lo que el dominio no puede: que la vista pide lo
 * que dice pedir. En particular que un evento de OTRA campaña no la despierta —
 * la diferencia entre tiempo real dirigido y una invalidación global.
 */

jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

const showModal = jest.fn();
const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal, closeModal: jest.fn() }),
}));

/** Socket falso: guarda los handlers para poder dispararlos desde el test. */
const handlers: Record<string, (payload: unknown) => void> = {};
jest.mock("@/core/realtime/use-socket", () => ({
  useSocket: () => ({ socket: {}, connected: true }),
  useSocketEvent: (_socket: unknown, event: string, handler: (p: unknown) => void) => {
    handlers[event] = handler;
  },
}));

const downloadCsv = jest.fn();
jest.mock("@/core/lib/csv", () => ({
  ...jest.requireActual("@/core/lib/csv"),
  downloadCsv: (name: string, content: string) => downloadCsv(name, content),
}));

jest.mock("@/modules/marketing/infrastructure/services/campaigns-service.adapter", () => ({
  getCampaign: jest.fn(),
  getCampaignStats: jest.fn(),
  listCampaignRecipients: jest.fn(),
  pauseCampaign: jest.fn(),
  resumeCampaign: jest.fn(),
  cancelCampaign: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require("@/modules/marketing/infrastructure/services/campaigns-service.adapter") as {
  getCampaign: jest.Mock;
  getCampaignStats: jest.Mock;
  listCampaignRecipients: jest.Mock;
};

function campaign(over: Partial<CampaignDTO> = {}): CampaignDTO {
  return {
    id: "c1",
    name: "Black Friday",
    description: null,
    status: "running",
    segment_id: "s1",
    audience_filters: null,
    audience_total: 1200,
    template: { id: "t1", name: "Promo julio", kind: "text" },
    hsm_channel_template_id: null,
    scheduled_at: null,
    launched_at: "2026-08-06T11:50:00.000Z",
    completed_at: null,
    created_at: "2026-08-06T11:40:00.000Z",
    updated_at: "2026-08-06T11:50:00.000Z",
    ...over,
  } as CampaignDTO;
}

function stats(over: Partial<CampaignStatsDTO> = {}): CampaignStatsDTO {
  return {
    campaign_id: "c1",
    audience_total: 1200,
    pending: 0,
    queued: 0,
    sent: 200,
    delivered: 400,
    read: 300,
    failed: 40,
    skipped: 260,
    // `cooldown` es anti-spam funcionando, no una pérdida: no debe listarse.
    skipped_by_reason: { opted_out: 200, outside_service_window: 60, cooldown: 12 },
    replies: 180,
    conversions: 45,
    revenue_cents: 450_000_000,
    delivery_rate: 0.745,
    reply_rate: 0.15,
    conversion_rate: 0.037,
    ...over,
  };
}

function recipient(over: Partial<CampaignRecipientDTO> = {}): CampaignRecipientDTO {
  return {
    id: "r1",
    contact: { id: "ct1", full_name: "Ana Pérez", phone: "+573000000000", email: null },
    status: "read",
    skip_reason: null,
    error_code: null,
    channel_kind: "whatsapp_cloud",
    conversation_id: "cv1",
    queued_at: "2026-08-06T12:00:00.000Z",
    sent_at: "2026-08-06T12:01:00.000Z",
    delivered_at: "2026-08-06T12:02:00.000Z",
    read_at: "2026-08-06T12:03:00.000Z",
    replied_at: null,
    converted_order_id: null,
    revenue_cents: null,
    ...over,
  };
}

const RECIPIENTS: CampaignRecipientDTO[] = [
  recipient(),
  recipient({
    id: "r2",
    contact: { id: "ct2", full_name: "Carla Ruiz", phone: "+573020000000", email: null },
    status: "skipped",
    skip_reason: "opted_out",
    channel_kind: null,
    conversation_id: null,
    queued_at: null,
    sent_at: null,
    delivered_at: null,
    read_at: null,
  }),
  recipient({
    id: "r3",
    contact: { id: "ct3", full_name: "Diego Salas", phone: "+573030000000", email: null },
    status: "failed",
    error_code: "channel_disconnected",
    read_at: null,
    delivered_at: null,
    revenue_cents: 12_000_000,
  }),
];

beforeEach(() => {
  jest.clearAllMocks();
  api.getCampaign.mockResolvedValue(campaign());
  api.getCampaignStats.mockResolvedValue(stats());
  api.listCampaignRecipients.mockResolvedValue({
    data: RECIPIENTS,
    meta: { total: RECIPIENTS.length },
  });
});

afterEach(cleanup);

describe("campaña en curso", () => {
  beforeEach(async () => {
    render(<CampaignDetailView campaignId="c1" />);
    await screen.findByText("Black Friday");
  });

  it("acumula las cifras del embudo en vez de leerlas crudas", async () => {
    const path = within((await screen.findByText("El camino del mensaje")).closest("section")!);
    const stage = (label: string) => within(path.getByText(label).closest("li")!);
    // 200 sent + 400 delivered + 300 read + 40 failed
    expect(stage("Despachados").getByText("940")).toBeInTheDocument();
    // Quien leyó también recibió: 400 + 300
    expect(stage("Entregados").getByText("700")).toBeInTheDocument();
    expect(stage("Leídos").getByText("300")).toBeInTheDocument();
    expect(stage("Compraron").getByText("45")).toBeInTheDocument();
    // El avance cuenta lo procesado (omitidos incluidos): 1.200 de 1.200. No es «despachados».
    const progress = within(screen.getByText("Avance del envío").closest("section")!);
    expect(progress.getByText("1.200")).toBeInTheDocument();
    expect(progress.getByText("300 no lo recibieron", { exact: false })).toBeInTheDocument();
  });

  it("explica cada silencio y deja fuera el anti-spam transitorio", async () => {
    // Dentro del panel: el mismo motivo aparece también en la fila de Carla.
    const panel = within(
      (await screen.findByText("No lo recibieron")).closest("section")!,
    );
    expect(panel.getByText("El contacto pidió no recibir promociones")).toBeInTheDocument();
    expect(panel.getByText("Pasaron más de 24 h y no había plantilla de Meta")).toBeInTheDocument();
    // `cooldown` libera el episodio: el contacto sí puede recibirlo más tarde.
    expect(panel.queryByText("Se le escribió hace muy poco")).not.toBeInTheDocument();
  });

  it("ofrece solo las acciones que permite su estado, y cancelar avisa", async () => {
    expect(screen.getByRole("button", { name: "Pausar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reanudar" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar envío" }));
    expect(showModal).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "¿Cancelar «Black Friday»?",
        description: expect.stringContaining("no se puede deshacer"),
      }),
    );
  });

  it("muestra por destinatario el hito más avanzado y por qué falló", () => {
    const rowFor = (name: string) => within(screen.getByText(name).closest("tr")!);
    expect(rowFor("Ana Pérez").getAllByText("Leyó").length).toBeGreaterThan(0);
    expect(rowFor("Carla Ruiz").getAllByText("El contacto pidió no recibir promociones").length).toBeGreaterThan(0);
    expect(rowFor("Diego Salas").getAllByText("channel_disconnected").length).toBeGreaterThan(0);
  });

  it("filtrar destinatarios vuelve a la página 1 y repregunta", async () => {
    fireEvent.click(
      within(screen.getByRole("radiogroup", { name: "Filtrar destinatarios por estado" })).getByRole("radio", {
        name: "Omitido",
      }),
    );
    await waitFor(() =>
      expect(api.listCampaignRecipients).toHaveBeenLastCalledWith(
        "c1",
        expect.objectContaining({ status: "skipped", page: 1 }),
      ),
    );
  });

  it("el CSV baja TODOS los destinatarios, no la página visible", async () => {
    fireEvent.click(screen.getByRole("button", { name: /Exportar CSV/ }));

    await waitFor(() => expect(downloadCsv).toHaveBeenCalled());
    const [, content] = downloadCsv.mock.calls[0];
    expect(api.listCampaignRecipients).toHaveBeenCalledWith(
      "c1",
      expect.objectContaining({ page: 1, page_size: 100 }),
    );
    expect(content).toContain("Ana Pérez");
    expect(content).toContain("Carla Ruiz");
    expect(content).toContain("El contacto pidió no recibir promociones");
  });
});

describe("tiempo real dirigido", () => {
  beforeEach(async () => {
    render(<CampaignDetailView campaignId="c1" />);
    await screen.findByText("Black Friday");
    api.getCampaignStats.mockClear();
  });

  it("un progreso de OTRA campaña no despierta a esta", async () => {
    act(() => {
      handlers["marketing.campaign_progress"]({
        company_id: "co1",
        campaign_id: "otra",
        audience_total: 5,
        pending: 5,
        simulated: false,
      });
    });
    expect(api.getCampaignStats).not.toHaveBeenCalled();
  });

  it("el progreso propio re-pide SOLO las stats", async () => {
    act(() => {
      handlers["marketing.campaign_progress"]({
        company_id: "co1",
        campaign_id: "c1",
        audience_total: 1200,
        pending: 100,
        simulated: false,
      });
    });
    await waitFor(() => expect(api.getCampaignStats).toHaveBeenCalledWith("c1"));
    // La campaña no se recarga entera: el evento solo movió cifras.
    expect(api.getCampaign).toHaveBeenCalledTimes(1);
  });

  it("un cambio de estado se refleja al instante en el badge", async () => {
    act(() => {
      handlers["marketing.campaign_status_changed"]({
        company_id: "co1",
        campaign_id: "c1",
        status: "paused",
        simulated: false,
      });
    });
    expect((await screen.findAllByText(/Pausada/)).length).toBeGreaterThan(0);
    expect(await screen.findByRole("button", { name: "Reanudar" })).toBeInTheDocument();
  });
});

describe("estados sin datos", () => {
  it("un borrador dice que su audiencia se calcula al lanzar y no enseña cifras en cero", async () => {
    api.getCampaign.mockResolvedValue(campaign({ status: "draft", launched_at: null }));
    api.getCampaignStats.mockResolvedValue(
      stats({ audience_total: 0, sent: 0, delivered: 0, read: 0, failed: 0, skipped: 0, skipped_by_reason: {}, replies: 0, conversions: 0, revenue_cents: 0 }),
    );
    api.listCampaignRecipients.mockResolvedValue({ data: [], meta: { total: 0 } });

    render(<CampaignDetailView campaignId="c1" />);

    expect(await screen.findByText(/la audiencia no se congela/)).toBeInTheDocument();
    // Sin lanzar no hay envío que pausar ni cancelar, ni cifras en cero que mirar.
    expect(screen.queryByRole("button", { name: "Pausar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar envío" })).not.toBeInTheDocument();
    expect(screen.queryByText("El camino del mensaje")).not.toBeInTheDocument();
    // Un borrador no tiene avance: su audiencia se calcula al lanzar, y se retoma en el asistente.
    expect(screen.getByText("Se calcula al lanzar")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continuar" })).toHaveAttribute("href", "/marketing/campaigns/new?campaign=c1");
  });

  it("un fallo de carga se explica y se puede reintentar", async () => {
    api.getCampaign.mockRejectedValueOnce(new Error("El servidor no respondió"));
    render(<CampaignDetailView campaignId="c1" />);

    expect(await screen.findByText("El servidor no respondió")).toBeInTheDocument();

    api.getCampaign.mockResolvedValue(campaign());
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Black Friday")).toBeInTheDocument();
  });
});
