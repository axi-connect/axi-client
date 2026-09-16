import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { HsmTemplateDTO } from "@/modules/marketing/domain/template-catalog";
import { MetaTemplatesView } from "../MetaTemplatesView";

/** Agrupados por escenario (ver `PromotionsView.test.tsx`). */

jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal: jest.fn(), closeModal: jest.fn() }),
}));

jest.mock("@/modules/channels/public", () => ({ listChannels: jest.fn() }));
jest.mock("@/modules/marketing/infrastructure/services/templates-service.adapter", () => ({
  listHsmTemplates: jest.fn(),
  syncHsmTemplates: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const channelsApi = require("@/modules/channels/public") as { listChannels: jest.Mock };
const api = require("@/modules/marketing/infrastructure/services/templates-service.adapter") as {
  listHsmTemplates: jest.Mock;
  syncHsmTemplates: jest.Mock;
};
/* eslint-enable @typescript-eslint/no-require-imports */

function hsm(over: Partial<HsmTemplateDTO> = {}): HsmTemplateDTO {
  return {
    id: "h1",
    channel_id: "ch1",
    name: "promo_agosto",
    language: "es",
    category: "marketing",
    body: "Hola {{1}}, tenemos novedades",
    components: [],
    approval_status: "approved",
    rejected_reason: null,
    quality_score: null,
    external_id: null,
    updated_at: "2026-08-01T00:00:00.000Z",
    ...over,
  };
}

const CLOUD = {
  data: [
    { id: "ch1", name: "WhatsApp Cloud", kind: "whatsapp_cloud", display_phone_number: "+57 300" },
    { id: "ch2", name: "WhatsApp Web", kind: "whatsapp_web", display_phone_number: null },
  ],
};

beforeEach(() => jest.clearAllMocks());
afterEach(cleanup);

describe("canal cloud con plantillas", () => {
  beforeEach(async () => {
    channelsApi.listChannels.mockResolvedValue(CLOUD);
    api.listHsmTemplates.mockResolvedValue([
      hsm(),
      hsm({ id: "h2", name: "aviso_pedido", category: "utility" }),
      hsm({ id: "h3", name: "promo_julio", approval_status: "paused" }),
    ]);
    render(<MetaTemplatesView />);
    await screen.findByText("promo_agosto");
  });

  it("solo ofrece canales cloud: WhatsApp Web no admite plantillas de Meta", () => {
    const options = screen.getAllByRole("option").map((o) => o.textContent);
    expect(options).toHaveLength(1);
    expect(options[0]).toContain("WhatsApp Cloud");
  });

  it("cuenta cuántas sirven de verdad, por uso: abrir seguimientos y promociones", () => {
    // Abren seguimientos las aprobadas que no son de autenticación (marketing +
    // utility: 2); promocionan solo las aprobadas de marketing (1). El contador
    // se compone de varias expresiones JSX: se lee el texto del nodo entero.
    expect(
      screen.getByText(
        (_, el) =>
          el?.tagName === "SPAN" && el.textContent === "2 para abrir seguimientos · 1 para promociones",
      ),
    ).toBeInTheDocument();
  });

  it("explica qué implica el estado de cada una, en las palabras del operador", () => {
    // Aprobada pero utility: sirve para abrir seguimientos, no para promociones.
    expect(screen.getByText("Solo las de categoría Marketing sirven para promociones")).toBeInTheDocument();
    // Pausada: F2 cambió «Meta la tiene como pausada» por el POR QUÉ y el remedio.
    expect(screen.getByText(/Varios destinatarios la marcaron como no deseada/)).toBeInTheDocument();
    // El contenido se muestra siempre: ahora es una columna propia (las tres).
    expect(screen.getAllByText(/tenemos novedades/)).toHaveLength(3);
  });

  it("sincronizar vuelve a pedir la lista y dice cuántas trajo", async () => {
    api.syncHsmTemplates.mockResolvedValue({ synced: 2 });
    fireEvent.click(screen.getByRole("button", { name: /Sincronizar/ }));

    await waitFor(() =>
      expect(showAlert).toHaveBeenCalledWith(
        expect.objectContaining({ title: "2 plantillas sincronizadas" }),
      ),
    );
    expect(api.listHsmTemplates).toHaveBeenCalledTimes(2);
  });

  it("si Meta rechaza la sincronización, lo dice sin romper la tabla", async () => {
    api.syncHsmTemplates.mockRejectedValue(new Error("Meta devolvió 400"));
    fireEvent.click(screen.getByRole("button", { name: /Sincronizar/ }));

    await waitFor(() =>
      expect(showAlert).toHaveBeenCalledWith(
        expect.objectContaining({ tone: "error", title: "Meta devolvió 400" }),
      ),
    );
    expect(screen.getByText("promo_agosto")).toBeInTheDocument();
  });
});

describe("sin canal cloud", () => {
  it("explica que hace falta uno en vez de enseñar un selector vacío", async () => {
    channelsApi.listChannels.mockResolvedValue({
      data: [{ id: "ch2", name: "WhatsApp Web", kind: "whatsapp_web" }],
    });
    render(<MetaTemplatesView />);

    expect(
      await screen.findByText("No tienes ningún canal de WhatsApp Cloud"),
    ).toBeInTheDocument();
    // Sin canal no se pide nada al backend de marketing.
    expect(api.listHsmTemplates).not.toHaveBeenCalled();
  });
});

describe("lo que Meta contesta sobre una plantilla", () => {
  beforeEach(() => {
    channelsApi.listChannels.mockResolvedValue(CLOUD);
  });

  it("enseña POR QUÉ la rechazó, no una frase genérica", async () => {
    api.listHsmTemplates.mockResolvedValue([
      hsm({
        id: "h9",
        name: "promo_rechazada",
        approval_status: "rejected",
        rejected_reason: "El cuerpo promete un descuento que no aparece en el pie",
      }),
    ]);
    render(<MetaTemplatesView />);

    // Antes solo decía qué HACER, nunca qué estaba MAL, que es lo único que
    // sirve para corregirla.
    expect(
      await screen.findByText("El cuerpo promete un descuento que no aparece en el pie"),
    ).toBeInTheDocument();
  });

  it("traduce el enum de Meta: «INVALID_FORMAT» no le dice nada a nadie", async () => {
    api.listHsmTemplates.mockResolvedValue([
      hsm({
        id: "h12",
        name: "promo_rechazada",
        approval_status: "rejected",
        // Meta manda un ENUM, no una frase. Pintarlo crudo era un paso atrás
        // respecto de la frase genérica que había antes.
        rejected_reason: "INVALID_FORMAT",
      }),
    ]);
    render(<MetaTemplatesView />);

    expect(await screen.findByText(/El formato no le vale a Meta/)).toBeInTheDocument();
    expect(screen.queryByText("INVALID_FORMAT")).not.toBeInTheDocument();
  });

  it("y respeta la prosa cuando Meta sí la manda", async () => {
    const prosa = "Your template has parameters placed next to each other without text between them.";
    api.listHsmTemplates.mockResolvedValue([
      hsm({ id: "h13", approval_status: "rejected", rejected_reason: prosa }),
    ]);
    render(<MetaTemplatesView />);

    expect(await screen.findByText(new RegExp(prosa.slice(0, 30)))).toBeInTheDocument();
  });

  it("avisa de la calidad solo cuando ya no es verde", async () => {
    api.listHsmTemplates.mockResolvedValue([
      hsm({ id: "h10", name: "promo_verde", quality_score: "GREEN" }),
      hsm({ id: "h11", name: "promo_amarilla", quality_score: "YELLOW" }),
    ]);
    render(<MetaTemplatesView />);

    // La calidad es el aviso PREVIO a que Meta pause la plantilla.
    expect(await screen.findByText(/Calidad yellow/)).toBeInTheDocument();
    expect(screen.queryByText(/Calidad green/)).not.toBeInTheDocument();
  });
});
