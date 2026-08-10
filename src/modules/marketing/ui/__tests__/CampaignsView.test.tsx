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

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));

jest.mock("@/modules/marketing/infrastructure/services/campaigns-service.adapter", () => ({
  listCampaigns: jest.fn(),
  pauseCampaign: jest.fn(),
  resumeCampaign: jest.fn(),
  cancelCampaign: jest.fn(),
  deleteCampaign: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require("@/modules/marketing/infrastructure/services/campaigns-service.adapter") as {
  listCampaigns: jest.Mock;
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

/** Todo se comprueba dentro de la fila: fuera hay un `select` con las mismas etiquetas. */
const rowFor = (name: string) => within(screen.getByText(name).closest("tr")!);

describe("listado con campañas de todos los estados", () => {
  beforeEach(async () => {
    api.listCampaigns.mockResolvedValue({ data: MIXED, meta: { total: 5 } });
    render(<CampaignsView />);
    await screen.findByText("Black Friday");
  });

  it("nombra «Procesada» a lo despachado y explica por qué no es «Entregada»", () => {
    expect(rowFor("Reactivación fríos").getByText("Procesada")).toBeInTheDocument();
    expect(screen.queryByText("Completada")).not.toBeInTheDocument();
    expect(screen.getByText(/La entrega se sigue confirmando después/)).toBeInTheDocument();
  });

  it("dice de dónde sale cada audiencia y qué se manda", () => {
    expect(
      rowFor("Black Friday").getByText("segmento guardado · plantilla «Promo julio»"),
    ).toBeInTheDocument();
    expect(
      rowFor("Lanzamiento agosto").getByText("filtros a medida · plantilla «Promo julio»"),
    ).toBeInTheDocument();
    expect(
      rowFor("Prueba interna").getByText("todos los contactos · sin contenido"),
    ).toBeInTheDocument();
  });

  it("muestra la fecha solo de la programada y un guion donde no hay dato", () => {
    expect(rowFor("Lanzamiento agosto").getByText(/8 de ago/)).toBeInTheDocument();
    // Borrador: ni audiencia ni programación.
    expect(rowFor("Prueba interna").getAllByText("—")).toHaveLength(2);
  });

  it("ofrece en cada fila solo las acciones que su estado permite", () => {
    // Enviando: se pausa y se cancela; no se borra.
    expect(rowFor("Black Friday").getByText("Pausar")).toBeInTheDocument();
    expect(rowFor("Black Friday").getByText("Cancelar campaña")).toBeInTheDocument();
    expect(rowFor("Black Friday").queryByText("Eliminar borrador")).not.toBeInTheDocument();

    // Pausada: se reanuda.
    expect(rowFor("Recordatorio julio").getByText("Reanudar")).toBeInTheDocument();

    // Borrador: solo se elimina, porque no ha salido nada.
    expect(rowFor("Prueba interna").getByText("Eliminar borrador")).toBeInTheDocument();
    expect(rowFor("Prueba interna").queryByText("Pausar")).not.toBeInTheDocument();

    // Terminal: sin acciones de ciclo de vida.
    expect(
      rowFor("Reactivación fríos").queryByRole("button", { name: /Más acciones/ }),
    ).not.toBeInTheDocument();
  });

  it("cancelar exige confirmación que avisa de que no se deshace", () => {
    fireEvent.click(
      within(screen.getByText("Black Friday").closest("tr")!).getByText("Cancelar campaña"),
    );

    expect(showModal).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "¿Cancelar «Black Friday»?",
        description: expect.stringContaining("no se puede deshacer"),
      }),
    );
  });

  it("filtrar por estado vuelve a la página 1 y repregunta al backend", async () => {
    fireEvent.change(screen.getByLabelText("Filtrar por estado"), { target: { value: "draft" } });

    await waitFor(() =>
      expect(api.listCampaigns).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "draft", page: 1 }),
      ),
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

    expect(await screen.findByText("No fue posible contactar al servidor")).toBeInTheDocument();

    api.listCampaigns.mockResolvedValue({ data: MIXED, meta: { total: 5 } });
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Black Friday")).toBeInTheDocument();
  });
});
