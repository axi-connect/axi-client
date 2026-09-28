import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HttpError } from "@/core/api/problem";
import { CreateHsmTemplateModal } from "../CreateHsmTemplateModal";
import type { HsmTemplateDTO } from "@/modules/marketing/domain/template-catalog";

const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert }),
}));
jest.mock("@/modules/marketing/infrastructure/services/templates-service.adapter", () => ({
  createHsmTemplate: jest.fn(),
  updateHsmTemplate: jest.fn(),
  listHsmTemplates: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const api = require("@/modules/marketing/infrastructure/services/templates-service.adapter") as {
  createHsmTemplate: jest.Mock;
  updateHsmTemplate: jest.Mock;
  listHsmTemplates: jest.Mock;
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

describe("enviar una plantilla nueva (incidente 2026-09-28)", () => {
  function openNew(onExists = jest.fn(), onOpenChange = jest.fn()) {
    render(
      <CreateHsmTemplateModal open channelId="ch1" onOpenChange={onOpenChange} onCreated={jest.fn()} onExists={onExists} />,
    );
    fireEvent.change(screen.getByLabelText("Nombre interno"), { target: { value: "sesion_en_vivo_v1" } });
    fireEvent.change(screen.getByPlaceholderText(/Hola \{\{1\}\}, te escribo/), {
      target: { value: "Gracias por escribirnos, ya te atendemos." },
    });
    return onExists;
  }

  it("dos clics seguidos mandan UN solo POST: el segundo crearía en Meta otra vez", async () => {
    let resolve: (value: unknown) => void = () => undefined;
    api.createHsmTemplate.mockImplementation(() => new Promise((done) => (resolve = done)));
    openNew();

    const send = screen.getByRole("button", { name: "Enviar a revisión de Meta" });
    fireEvent.click(send);
    fireEvent.click(send);

    await waitFor(() => expect(api.createHsmTemplate).toHaveBeenCalledTimes(1));
    resolve(template([]));
  });

  const send = () => fireEvent.click(screen.getByRole("button", { name: "Enviar a revisión de Meta" }));

  it("409 con la plantilla aquí: lo dice DENTRO del formulario, recarga la lista y ofrece otro nombre", async () => {
    api.createHsmTemplate.mockRejectedValue(
      new HttpError({
        status: 409,
        code: "channels/template_exists",
        message: "ya existe",
        problem: {
          type: "t",
          title: "Ya existe una plantilla con ese nombre e idioma",
          status: 409,
          code: "channels/template_exists",
          details: { template_id: "h1", approval_status: "pending" },
        },
      }),
    );
    const onExists = openNew();
    send();

    expect(await screen.findByText("Ya tienes «sesion_en_vivo_v1» (es_CO) en este canal")).toBeInTheDocument();
    expect(screen.getByText(/Está en revisión/)).toBeInTheDocument();
    expect(onExists).toHaveBeenCalled();
    // El aviso no es flotante: se queda hasta que el operador actúe.
    expect(showAlert).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Usar sesion_en_vivo_v2" }));
    expect(screen.getByLabelText("Nombre interno")).toHaveValue("sesion_en_vivo_v2");
    expect(screen.queryByText(/en este canal$/)).not.toBeInTheDocument();
  });

  it("409 sin la fila aquí (Graph 2388024): Meta ya la tiene, se ofrece sincronizar", async () => {
    api.createHsmTemplate.mockRejectedValue(
      new HttpError({ status: 409, code: "channels/template_exists", message: "Meta ya tiene una plantilla" }),
    );
    openNew();
    send();
    expect(await screen.findByText("Meta ya tiene una plantilla con ese nombre e idioma")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sincronizar con Meta" })).toBeInTheDocument();
  });

  it("Meta la rechaza (502): dice lo que dijo Meta y la referencia para su soporte", async () => {
    api.createHsmTemplate.mockRejectedValue(
      new HttpError({
        status: 502,
        code: "channels/template_sync_failed",
        message: "El proveedor rechazó el envío del mensaje: Invalid parameter",
        problem: {
          type: "t",
          title: "Meta rechazó la operación con la plantilla",
          status: 502,
          code: "channels/template_sync_failed",
          detail: "El proveedor rechazó el envío del mensaje: Invalid parameter",
          details: { detail: "Invalid parameter", fbtrace_id: "AxE78QRNA4o" },
        },
      }),
    );
    openNew();
    send();
    expect(await screen.findByText("Meta no aceptó la plantilla")).toBeInTheDocument();
    expect(screen.getByText(/Meta dijo: «Invalid parameter»/)).toBeInTheDocument();
    expect(screen.getByText("AxE78QRNA4o")).toBeInTheDocument();
  });

  it("sin respuesta: no deja reenviar a ciegas; mira la lista y, si llegó, cierra", async () => {
    // El incidente: la respuesta se perdió, el operador reenvió y Meta dijo «ya existe».
    api.createHsmTemplate.mockRejectedValue(new TypeError("Failed to fetch"));
    api.listHsmTemplates.mockResolvedValue([{ ...template([]), name: "sesion_en_vivo_v1", language: "es_CO" }]);
    const onOpenChange = jest.fn();
    openNew(jest.fn(), onOpenChange);
    send();

    expect(await screen.findByText("No sabemos si Meta la recibió")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar a revisión de Meta" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Actualizar la lista" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ title: "Ya llegó a Meta" }));
    expect(api.createHsmTemplate).toHaveBeenCalledTimes(1);
  });

  it("la vista previa enseña el mensaje entero: también el pie", () => {
    openNew();
    fireEvent.click(screen.getByRole("button", { name: "Añadir pie" }));
    fireEvent.change(screen.getByLabelText("Texto del pie"), { target: { value: "Responde SALIR" } });
    // Dos previas (la plegable del celular y la columna de escritorio): las dos lo muestran.
    expect(screen.getAllByText("Responde SALIR").length).toBeGreaterThanOrEqual(2);
  });

  it("un pie añadido y vacío no se envía: se pide escribirlo o quitarlo", () => {
    openNew();
    fireEvent.click(screen.getByRole("button", { name: "Añadir pie" }));
    fireEvent.click(screen.getByRole("button", { name: "Enviar a revisión de Meta" }));

    expect(screen.getByText("Escribe el pie o quítalo")).toBeInTheDocument();
    expect(api.createHsmTemplate).not.toHaveBeenCalled();
  });
});
