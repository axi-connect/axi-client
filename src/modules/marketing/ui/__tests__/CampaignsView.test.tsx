import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { CampaignDTO } from "@/modules/marketing/domain/campaign";
import { CampaignsView } from "../CampaignsView";

/**
 * Agrupados POR ESCENARIO (ver la cabecera de `PromotionsView.test.tsx`): un
 * único fixture con una campaña de cada estado cubre de golpe las etiquetas,
 * las acciones derivadas de los predicados y las columnas sin dato.
 */

jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

const showModal = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn(), showModal, closeModal: jest.fn() }),
}));

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/marketing/campaigns",
}));

jest.mock("@/modules/marketing/infrastructure/services/campaigns-service.adapter", () => ({
  listCampaigns: jest.fn(),
  pauseCampaign: jest.fn(),
  resumeCampaign: jest.fn(),
  cancelCampaign: jest.fn(),
  deleteCampaign: jest.fn(),
  createCampaign: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require("@/modules/marketing/infrastructure/services/campaigns-service.adapter") as {
  listCampaigns: jest.Mock;
  createCampaign: jest.Mock;
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
    started_at: "2026-08-06T12:00:00.000Z",
    completed_at: null,
    created_at: "2026-08-06T11:50:00.000Z",
    updated_at: "2026-08-06T12:00:00.000Z",
    ...over,
  } as CampaignDTO;
}

/** Una de cada estado: es la lista que de verdad ve un tenant con recorrido. */
const MIXED: CampaignDTO[] = [
  campaign(),
  campaign({ id: "c2", name: "Recordatorio julio", status: "paused", audience_total: 900 }),
  campaign({
    id: "c3",
    name: "Lanzamiento agosto",
    status: "scheduled",
    audience_total: 540,
    scheduled_at: "2026-08-08T14:00:00.000Z",
    segment_id: null,
    audience_filters: { lifecycle_stage: ["customer"] },
  }),
  campaign({ id: "c4", name: "Reactivación fríos", status: "completed", audience_total: 2100 }),
  campaign({
    id: "c5",
    name: "Prueba interna",
    status: "draft",
    audience_total: undefined,
    segment_id: null,
    template: null,
  }),
];

beforeEach(() => jest.clearAllMocks());
afterEach(cleanup);

/** Todo se comprueba dentro de la fila: fuera está el filtro con las mismas etiquetas. */
const rowFor = (name: string) => within(screen.getByText(name).closest("tr")!);

/**
 * Abre el menú «Más acciones» de una fila. En jsdom no hay container queries:
 * se pintan las dos copias de las acciones (la de móvil y la de escritorio);
 * vale la primera. El menú va con `portal`, así que sus opciones viven en
 * `document.body`, fuera de la fila.
 */
function openMenu(name: string) {
  fireEvent.click(rowFor(name).getAllByRole("button", { name: `Más acciones de ${name}` })[0]);
  return within(screen.getByRole("menu"));
}

describe("listado con campañas de todos los estados", () => {
  beforeEach(async () => {
    api.listCampaigns.mockResolvedValue({ data: MIXED, meta: { total: 5 } });
    render(<CampaignsView />);
    await screen.findByText("Black Friday");
  });

  it("nombra «Procesada» a lo despachado y explica por qué no es «Entregada»", () => {
    expect(rowFor("Reactivación fríos").getAllByText("Procesada").length).toBeGreaterThan(0);
    expect(screen.queryByText("Completada")).not.toBeInTheDocument();
    expect(screen.getByText(/la entrega se sigue confirmando/)).toBeInTheDocument();
  });

  it("dice de dónde sale cada audiencia y qué se manda", () => {
    expect(rowFor("Black Friday").getByText("segmento guardado · plantilla «Promo julio»")).toBeInTheDocument();
    expect(rowFor("Lanzamiento agosto").getByText("filtros a medida · plantilla «Promo julio»")).toBeInTheDocument();
    expect(rowFor("Prueba interna").getByText("todos los contactos · sin contenido")).toBeInTheDocument();
  });

  it("dice cuándo sale la programada y que la audiencia de un borrador se calcula al lanzar", () => {
    expect(rowFor("Lanzamiento agosto").getAllByText(/^Sale el 8/).length).toBeGreaterThan(0);
    expect(rowFor("Prueba interna").getByText("al lanzar")).toBeInTheDocument();
    expect(rowFor("Prueba interna").getAllByText(/^Creada el/).length).toBeGreaterThan(0);
  });

  it("un borrador se continúa en el asistente; el resto se ve", () => {
    const [cont] = rowFor("Prueba interna").getAllByRole("link", { name: "Continuar" });
    expect(cont).toHaveAttribute("href", "/marketing/campaigns/new?campaign=c5");
    const [ver] = rowFor("Black Friday").getAllByRole("link", { name: "Ver" });
    expect(ver).toHaveAttribute("href", "/marketing/campaigns/c1");
  });

  it("ofrece en cada fila solo las acciones que su estado permite", () => {
    // Enviando: se pausa y se cancela; no se borra.
    let menu = openMenu("Black Friday");
    expect(menu.getByText("Pausar")).toBeInTheDocument();
    expect(menu.getByText("Cancelar campaña")).toBeInTheDocument();
    expect(menu.queryByText("Eliminar borrador")).not.toBeInTheDocument();
    expect(menu.queryByText("Editar")).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    // Programada: se edita en el asistente.
    menu = openMenu("Lanzamiento agosto");
    expect(menu.getByRole("menuitem", { name: "Editar" })).toHaveAttribute("href", "/marketing/campaigns/new?campaign=c3");
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    // Pausada: se reanuda.
    menu = openMenu("Recordatorio julio");
    expect(menu.getByText("Reanudar")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    // Borrador: se elimina, porque no ha salido nada.
    menu = openMenu("Prueba interna");
    expect(menu.getByText("Eliminar borrador")).toBeInTheDocument();
    expect(menu.queryByText("Pausar")).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    // Terminal: sin ciclo de vida, pero se puede duplicar.
    menu = openMenu("Reactivación fríos");
    expect(menu.getByText("Duplicar")).toBeInTheDocument();
    expect(menu.queryByText("Pausar")).not.toBeInTheDocument();
    expect(menu.queryByText("Cancelar campaña")).not.toBeInTheDocument();
  });

  it("el menú de fila se pinta fuera de la tabla, para que su scroll no lo recorte", () => {
    openMenu("Black Friday");
    expect(screen.getByRole("menu").closest("table")).toBeNull();
    expect(screen.getByRole("menu").parentElement).toBe(document.body);
  });

  it("cancelar exige confirmación que avisa de que no se deshace", () => {
    fireEvent.click(openMenu("Black Friday").getByText("Cancelar campaña"));

    expect(showModal).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "¿Cancelar «Black Friday»?",
        description: expect.stringContaining("no se puede deshacer"),
      }),
    );
  });

  it("duplicar crea un borrador sin programación y lo abre en el asistente", async () => {
    api.createCampaign.mockResolvedValue({ id: "copia-1" });
    fireEvent.click(openMenu("Lanzamiento agosto").getByText("Duplicar"));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/marketing/campaigns/new?campaign=copia-1"));
    const dto = api.createCampaign.mock.calls[0][0];
    expect(dto.name).toBe("Copia de Lanzamiento agosto");
    expect(dto.scheduled_at ?? null).toBeNull();
    expect(dto.audience_filters).toEqual({ lifecycle_stage: ["customer"] });
  });

  it("filtrar por estado vuelve a la página 1 y repregunta al backend", async () => {
    fireEvent.click(screen.getByRole("radio", { name: "Borrador" }));

    await waitFor(() =>
      expect(api.listCampaigns).toHaveBeenLastCalledWith(expect.objectContaining({ status: "draft", page: 1 })),
    );
  });
});

describe("estados sin datos", () => {
  it("distingue «no hay ninguna» de «ninguna con este filtro»", async () => {
    api.listCampaigns.mockResolvedValue({ data: [], meta: { total: 0 } });
    render(<CampaignsView />);

    expect(await screen.findByText("Todavía no le has escrito a tu base")).toBeInTheDocument();
    // Sin campañas ni filtro no hay barra de filtros que estorbe el vacío.
    expect(screen.queryByLabelText("Filtrar por estado")).not.toBeInTheDocument();
  });

  it("un fallo de carga se explica y se puede reintentar", async () => {
    api.listCampaigns.mockRejectedValueOnce(new Error("Network request failed"));
    render(<CampaignsView />);

    expect(await screen.findByText(/No fue posible contactar al servidor/)).toBeInTheDocument();

    api.listCampaigns.mockResolvedValue({ data: MIXED, meta: { total: 5 } });
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Black Friday")).toBeInTheDocument();
  });
});
