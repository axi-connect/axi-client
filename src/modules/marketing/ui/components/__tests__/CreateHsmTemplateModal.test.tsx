import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CreateHsmTemplateModal } from "../CreateHsmTemplateModal";
import type { HsmTemplateDTO } from "@/modules/marketing/domain/template-catalog";

jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn() }),
}));
jest.mock("@/modules/marketing/infrastructure/services/templates-service.adapter", () => ({
  createHsmTemplate: jest.fn(),
  updateHsmTemplate: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const api = require("@/modules/marketing/infrastructure/services/templates-service.adapter") as {
  createHsmTemplate: jest.Mock;
  updateHsmTemplate: jest.Mock;
};
/* eslint-enable @typescript-eslint/no-require-imports */

const template = (components: unknown[]): HsmTemplateDTO =>
  ({
    id: "h1",
    channel_id: "ch1",
    name: "promo_septiembre",
    language: "es",
    category: "marketing",
    body: "Hola {{1}}, tenemos algo para ti hoy.",
    components,
    approval_status: "rejected",
    rejected_reason: null,
    quality_score: null,
    editable: true,
    edit_blocked_reason: null,
    edit_retry_at: null,
    external_id: "777",
    updated_at: "2026-09-16T00:00:00.000Z",
  }) as HsmTemplateDTO;

beforeEach(() => {
  jest.clearAllMocks();
  api.updateHsmTemplate.mockResolvedValue(template([]));
});

function open(editing: HsmTemplateDTO) {
  render(
    <CreateHsmTemplateModal
      open
      channelId="ch1"
      editing={editing}
      onOpenChange={jest.fn()}
      onCreated={jest.fn()}
    />,
  );
}

describe("quitar una pieza al editar", () => {
  it("manda el pie VACÍO, porque omitirlo lo conservaría", async () => {
    // Editar reemplaza todos los componentes en Meta: omitir la clave no quita
    // nada. Antes el botón decía que guardaba y el pie seguía ahí.
    open(
      template([
        { type: "BODY", text: "Hola {{1}}, tenemos algo para ti hoy." },
        { type: "FOOTER", text: "Responde SALIR para no recibir más" },
      ]),
    );

    fireEvent.click(screen.getByRole("button", { name: "Quitar el pie" }));
    fireEvent.click(screen.getByRole("button", { name: /Guardar y reenviar/ }));

    await waitFor(() => {
      expect(api.updateHsmTemplate).toHaveBeenCalled();
    });
    expect(api.updateHsmTemplate.mock.calls[0][1]).toMatchObject({ footer: null });
  });

  it("pero OMITE la cabecera de imagen, que no sabe enseñar", async () => {
    // Las dos cosas dejan `header` en null en el formulario; confundirlas
    // borraría una cabecera que el operador ni siquiera vio.
    open(
      template([
        { type: "HEADER", format: "IMAGE", example: { header_handle: ["4::aW1h"] } },
        { type: "BODY", text: "Hola {{1}}, tenemos algo para ti hoy." },
      ]),
    );

    fireEvent.click(screen.getByRole("button", { name: /Guardar y reenviar/ }));

    await waitFor(() => {
      expect(api.updateHsmTemplate).toHaveBeenCalled();
    });
    expect(api.updateHsmTemplate.mock.calls[0][1]).not.toHaveProperty("header");
  });
});
