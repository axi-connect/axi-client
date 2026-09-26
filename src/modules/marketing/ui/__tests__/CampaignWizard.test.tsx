import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CampaignWizard } from "../CampaignWizard";

/**
 * Agrupados por escenario (ver `PromotionsView.test.tsx`). Lo que se comprueba
 * aquí es lo que NO cabe en el dominio: la secuencia real de llamadas al
 * backend, que es lo que impone `preview-audience` (POST sobre una campaña que
 * ya existe) y por tanto la razón de que el paso 1 cree el borrador.
 */

jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

const showModal = jest.fn();
const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal, closeModal: jest.fn() }),
}));

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

jest.mock("@/modules/crm/public", () => ({
  listSegments: jest.fn(),
  listTags: jest.fn(),
  compactSegmentFilters: (f: unknown) => f,
  describeSegmentFilters: () => "etapa ∈ [Cliente]",
  AudienceFilterBuilder: () => <div data-testid="audience-builder" />,
}));

jest.mock("@/modules/marketing/infrastructure/services/campaigns-service.adapter", () => ({
  createCampaign: jest.fn(),
  updateCampaign: jest.fn(),
  previewAudience: jest.fn(),
  launchCampaign: jest.fn(),
  getCampaign: jest.fn(),
}));
jest.mock("@/modules/marketing/infrastructure/services/templates-service.adapter", () => ({
  listTemplates: jest.fn(),
  listHsmTemplates: jest.fn(),
  getMessagingWindow: jest.fn(),
}));
jest.mock("@/modules/channels/public", () => ({ listChannels: jest.fn() }));
jest.mock("@/modules/companies/public", () => ({ loadMyCompanyOnce: jest.fn() }));

/* eslint-disable @typescript-eslint/no-require-imports */
const crm = require("@/modules/crm/public") as {
  listSegments: jest.Mock;
  listTags: jest.Mock;
};
const api = require("@/modules/marketing/infrastructure/services/campaigns-service.adapter") as {
  createCampaign: jest.Mock;
  updateCampaign: jest.Mock;
  previewAudience: jest.Mock;
  launchCampaign: jest.Mock;
  getCampaign: jest.Mock;
};
const templatesApi = require("@/modules/marketing/infrastructure/services/templates-service.adapter") as {
  listTemplates: jest.Mock;
  listHsmTemplates: jest.Mock;
  getMessagingWindow: jest.Mock;
};
const channels = require("@/modules/channels/public") as { listChannels: jest.Mock };
const companies = require("@/modules/companies/public") as { loadMyCompanyOnce: jest.Mock };
/* eslint-enable @typescript-eslint/no-require-imports */

beforeEach(() => {
  jest.clearAllMocks();
  crm.listSegments.mockResolvedValue([{ id: "s1", name: "Clientes VIP", filters: {} }]);
  crm.listTags.mockResolvedValue([]);
  templatesApi.listTemplates.mockResolvedValue([
    { id: "t1", name: "Promo julio", kind: "text", body: "Hola {{first_name}}", is_active: true },
    { id: "t2", name: "Inactiva", kind: "text", body: "x", is_active: false },
  ]);
  api.createCampaign.mockResolvedValue({ id: "c1", name: "Black Friday", status: "draft" });
  api.updateCampaign.mockResolvedValue({ id: "c1", name: "Black Friday", status: "draft" });
  api.previewAudience.mockResolvedValue({ total: 1200, sample_size: 1000, sample_opted_out: 167 });
  api.launchCampaign.mockResolvedValue({ status: "running" });
  channels.listChannels.mockResolvedValue({
    data: [{ id: "ch1", name: "Ventas", kind: "whatsapp_cloud" }],
  });
  companies.loadMyCompanyOnce.mockResolvedValue({ name: "Savage" });
  templatesApi.getMessagingWindow.mockResolvedValue({ limit: 250, used: 0, remaining: 250 });
  templatesApi.listHsmTemplates.mockResolvedValue([
    {
      id: "h1",
      channel_id: "ch1",
      name: "promo_septiembre",
      language: "es",
      category: "marketing",
      body: "Hola {{1}}, {{2}} de descuento hoy.",
      components: [],
      approval_status: "approved",
      external_id: "ext",
      updated_at: "2026-09-15T00:00:00Z",
    },
  ]);
});

afterEach(cleanup);

/** Elige una opción de un `Select` (Radix): se abre con el teclado y se pulsa la opción. */
async function pick(label: string, option: string) {
  fireEvent.keyDown(await screen.findByRole("combobox", { name: label }), { key: "Enter" });
  fireEvent.click(await screen.findByRole("option", { name: option }));
}

/** Rellena el paso 1 y avanza. Devuelve tras haberse creado el borrador. */
async function fillAudienceAndAdvance() {
  fireEvent.change(await screen.findByLabelText("Nombre de la campaña"), {
    target: { value: "Black Friday" },
  });
  await pick("Segmento", "Clientes VIP");
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  await waitFor(() => expect(api.createCampaign).toHaveBeenCalled());
}

describe("paso 1 · audiencia", () => {
  it("no deja avanzar sin nombre ni segmento, y dice qué falta", async () => {
    render(<CampaignWizard />);
    await screen.findByLabelText("Nombre de la campaña");

    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
    expect(screen.getByText("Ponle un nombre de al menos 3 caracteres")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nombre de la campaña"), {
      target: { value: "Black Friday" },
    });
    expect(screen.getByText("Elige el segmento al que le vas a escribir")).toBeInTheDocument();
  });

  it("crea el BORRADOR y solo entonces pide la estimación", async () => {
    render(<CampaignWizard />);
    await fillAudienceAndAdvance();

    // El orden importa: `preview-audience` es un POST sobre una campaña
    // existente, así que sin crear antes no habría a quién preguntarle.
    expect(api.createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Black Friday", segment_id: "s1", audience_filters: null }),
    );
    await waitFor(() => expect(api.previewAudience).toHaveBeenCalledWith("c1"));
  });

  it("presenta las bajas como estimación, no como cifra exacta", async () => {
    render(<CampaignWizard />);
    await fillAudienceAndAdvance();

    // Se vuelve al paso 1 para ver el resumen ya calculado.
    fireEvent.click(await screen.findByRole("button", { name: "Atrás" }));

    expect(await screen.findByText("≈ 1.000")).toBeInTheDocument();
    expect(screen.getByText(/de 1.200 contactos/)).toBeInTheDocument();
    expect(screen.getByText(/estimado sobre una muestra de 1.000/)).toBeInTheDocument();
  });
});

describe("pasos 2 a 4", () => {
  beforeEach(async () => {
    render(<CampaignWizard />);
    await fillAudienceAndAdvance();
    await screen.findByText("¿Qué les dices?");
  });

  it("solo ofrece plantillas activas y previsualiza con las variables de campaña", async () => {
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Mensaje guardado" }), { key: "Enter" });
    expect(await screen.findByRole("option", { name: "Promo julio" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Inactiva" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("option", { name: "Promo julio" }));
    expect(await screen.findByText(/Hola Ana/)).toBeInTheDocument();
  });

  it("separa los dos públicos: dentro y fuera de la ventana de 24 h", () => {
    expect(screen.getByText("A quien te escribió hace poco")).toBeInTheDocument();
    expect(screen.getByText("A quien lleva más de 24 h")).toBeInTheDocument();
  });

  it("ofrece elegir la plantilla de Meta AHÍ MISMO, sin salir del asistente", async () => {
    // Antes este bloque era una franja ámbar que solo avisaba y enlazaba a otra
    // pantalla, en mitad de una campaña a medio hacer.
    expect(await screen.findByLabelText("Plantilla de Meta aprobada")).toBeInTheDocument();
    expect(templatesApi.listHsmTemplates).toHaveBeenCalledWith({
      channel_id: "ch1",
      approval_status: "approved",
    });
  });

  it("exige día y hora juntos en la programación", async () => {
    await pick("Mensaje guardado", "Promo julio");
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByText("¿Cuándo sale?");

    fireEvent.click(screen.getByRole("radio", { name: /Programar/ }));
    fireEvent.change(await screen.findByLabelText("Hora"), { target: { value: "" } });

    expect(screen.getByText("Indica la hora a la que sale")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
  });

  it("lanzar pide confirmación que dice a cuántas personas y que no se deshace", async () => {
    await pick("Mensaje guardado", "Promo julio");
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByText("¿Cuándo sale?");
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByText("Antes de enviar");

    fireEvent.click(screen.getByRole("button", { name: "Lanzar campaña" }));

    expect(showModal).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "¿Lanzar «Black Friday»?",
        description: expect.stringContaining("1.000 personas"),
      }),
    );
    // Confirmar es obligatorio: el clic por sí solo no lanza nada.
    expect(api.launchCampaign).not.toHaveBeenCalled();
  });
});

describe("paso 2 · con más de un número de WhatsApp", () => {
  it("deja elegir desde cuál sale, porque la plantilla es de uno solo", async () => {
    channels.listChannels.mockResolvedValue({
      data: [
        { id: "ch1", name: "Ventas", kind: "whatsapp_cloud" },
        { id: "ch2", name: "Soporte", kind: "whatsapp_cloud" },
      ],
    });
    render(<CampaignWizard />);
    await fillAudienceAndAdvance();
    await screen.findByText("¿Qué les dices?");

    // Meta no conoce la plantilla en los demás números: elegir mal significa
    // que el envío se omite con `hsm_channel_mismatch`.
    await pick("Número desde el que sale", "Soporte");

    await waitFor(() =>
      expect(templatesApi.listHsmTemplates).toHaveBeenCalledWith({
        channel_id: "ch2",
        approval_status: "approved",
      }),
    );
  });

  it("con un solo número no enseña el selector, que sería ruido", async () => {
    render(<CampaignWizard />);
    await fillAudienceAndAdvance();
    await screen.findByText("¿Qué les dices?");

    expect(screen.queryByRole("combobox", { name: "Número desde el que sale" })).not.toBeInTheDocument();
  });
});

describe("paso 2 · cuando no se puede alcanzar a los contactos fríos", () => {
  it("sin canal de WhatsApp Cloud lo dice, y dice qué pasa si sigues sin él", async () => {
    channels.listChannels.mockResolvedValue({ data: [] });
    render(<CampaignWizard />);
    await fillAudienceAndAdvance();
    await screen.findByText("¿Qué les dices?");

    expect(await screen.findByText(/WhatsApp Cloud/)).toBeInTheDocument();
    expect(screen.getByText(/solo llegará a quien esté dentro de la ventana/)).toBeInTheDocument();
  });

  it("sin ninguna plantilla aprobada ofrece crearla", async () => {
    templatesApi.listHsmTemplates.mockResolvedValue([]);
    render(<CampaignWizard />);
    await fillAudienceAndAdvance();
    await screen.findByText("¿Qué les dices?");

    expect(await screen.findByRole("link", { name: "Crear una plantilla" })).toBeInTheDocument();
  });

  it("descarta las que no sirven para una campaña: utility y no aprobadas", async () => {
    templatesApi.listHsmTemplates.mockResolvedValue([
      {
        id: "h2",
        channel_id: "ch1",
        name: "recordatorio",
        language: "es",
        category: "utility",
        body: "Tu pedido va en camino.",
        components: [],
        approval_status: "approved",
        external_id: "ext",
        updated_at: "2026-09-15T00:00:00Z",
      },
    ]);
    render(<CampaignWizard />);
    await fillAudienceAndAdvance();
    await screen.findByText("¿Qué les dices?");

    // Meta solo entrega MARKETING fuera de ventana para una campaña: ofrecer
    // una utility sería ofrecer algo que se rechaza al lanzar.
    expect(await screen.findByRole("link", { name: "Crear una plantilla" })).toBeInTheDocument();
  });
});

describe("retomar una campaña guardada", () => {
  const saved = {
    id: "c9",
    name: "Retomada",
    description: null,
    status: "draft",
    segment_id: "s1",
    audience_filters: null,
    template: { id: "t1", name: "Promo julio", kind: "text" },
    hsm_channel_template_id: null,
    hsm_param_mapping: null,
    scheduled_at: null,
    created_at: "2026-09-20T10:00:00.000Z",
    updated_at: "2026-09-20T10:00:00.000Z",
  };

  it("un borrador completo abre en «Antes de enviar», con lo guardado", async () => {
    api.getCampaign.mockResolvedValue(saved);
    render(<CampaignWizard resumeId="c9" />);

    expect(await screen.findByText("Antes de enviar")).toBeInTheDocument();
    expect(api.getCampaign).toHaveBeenCalledWith("c9");
    expect(screen.getByRole("heading", { level: 1, name: "Retomada" })).toBeInTheDocument();
    // Retomar no crea otra campaña: guarda sobre la misma.
    expect(api.createCampaign).not.toHaveBeenCalled();
    await waitFor(() => expect(api.previewAudience).toHaveBeenCalledWith("c9"));
  });

  it("un borrador a medias abre en el primer paso que le falta", async () => {
    api.getCampaign.mockResolvedValue({ ...saved, template: null });
    render(<CampaignWizard resumeId="c9" />);

    expect(await screen.findByText("¿Qué les dices?")).toBeInTheDocument();
  });

  it("una campaña que ya salió no se edita: lo dice y enlaza al detalle", async () => {
    api.getCampaign.mockResolvedValue({ ...saved, status: "running" });
    render(<CampaignWizard resumeId="c9" />);

    expect(await screen.findByText("Esta campaña ya salió")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver la campaña" })).toHaveAttribute("href", "/marketing/campaigns/c9");
  });

  it("una programada se guarda sin relanzarla", async () => {
    api.getCampaign.mockResolvedValue({ ...saved, status: "scheduled", scheduled_at: "2099-01-01T15:00:00.000Z" });
    render(<CampaignWizard resumeId="c9" />);

    fireEvent.click(await screen.findByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(api.updateCampaign).toHaveBeenCalledWith("c9", expect.objectContaining({ name: "Retomada" })));
    expect(api.launchCampaign).not.toHaveBeenCalled();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/marketing/campaigns/c9"));
  });
});
