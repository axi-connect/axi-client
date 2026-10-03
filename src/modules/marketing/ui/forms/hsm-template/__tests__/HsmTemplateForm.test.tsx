import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { HttpError } from "@/core/api/problem";
import type { HsmTemplateDTO } from "@/modules/marketing/domain/template-catalog";
import { HsmTemplateForm } from "../HsmTemplateForm";

/**
 * La página que reemplaza a la modal (hsm-media F3). Los casos de la modal se
 * conservan —cada uno tapa un incidente real del 2026-09-28— y se suman los de
 * la página: nombre y versión, y el punto de partida.
 */

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

const template = (over: Partial<HsmTemplateDTO> = {}): HsmTemplateDTO =>
  ({
    id: "h1",
    channel_id: "ch1",
    name: "promo_septiembre_v1",
    language: "es_CO",
    category: "marketing",
    body: "Hola {{1}}, tenemos algo para ti hoy.",
    components: [],
    approval_status: "rejected",
    rejected_reason: null,
    quality_score: null,
    editable: true,
    edit_blocked_reason: null,
    edit_retry_at: null,
    external_id: "777",
    updated_at: "2026-09-16T00:00:00.000Z",
    ...over,
  }) as HsmTemplateDTO;

const handlers = () => ({
  onSaved: jest.fn(),
  onViewExisting: jest.fn(),
  onSync: jest.fn(),
  onDirtyChange: jest.fn(),
  onCancel: jest.fn(),
});

beforeEach(() => {
  jest.clearAllMocks();
  api.updateHsmTemplate.mockResolvedValue(template());
  api.createHsmTemplate.mockResolvedValue(template({ id: "nueva", name: "sesion_en_vivo_v1" }));
  api.listHsmTemplates.mockResolvedValue([]);
});

function renderNew(templates: HsmTemplateDTO[] = []) {
  const props = handlers();
  render(<HsmTemplateForm channelId="ch1" templates={templates} {...props} />);
  return props;
}

function fill(name = "Sesión en vivo", body = "Gracias por escribirnos, ya te atendemos.") {
  fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: name } });
  fireEvent.change(screen.getByPlaceholderText(/Hola \{\{1\}\}, te escribo/), { target: { value: body } });
}

const send = () => fireEvent.click(screen.getByRole("button", { name: "Enviar a revisión de Meta" }));

describe("nombre y versión: se escribe como se dice", () => {
  it("Meta recibe el formato, con la versión libre ya puesta", () => {
    renderNew();
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "¡Promo Día de la Madre!" } });

    expect(screen.getAllByText("promo_dia_de_la_madre_v1").length).toBeGreaterThan(0);
  });

  it("si la v1 ya existe en ese idioma, propone la v2 y envía con ella", async () => {
    renderNew([template({ name: "sesion_en_vivo_v1", approval_status: "approved" })]);
    fill();
    expect(screen.getAllByText("sesion_en_vivo_v2").length).toBeGreaterThan(0);

    send();
    await waitFor(() => expect(api.createHsmTemplate).toHaveBeenCalled());
    expect(api.createHsmTemplate.mock.calls[0][0]).toMatchObject({ name: "sesion_en_vivo_v2", language: "es_CO" });
  });

  it("al editar, nombre y versión son fijos", () => {
    render(<HsmTemplateForm channelId="ch1" templates={[]} editing={template()} {...handlers()} />);

    expect(screen.getByLabelText("Nombre")).toBeDisabled();
    expect(screen.getAllByText("promo_septiembre_v1").length).toBeGreaterThan(0);
  });
});

describe("editar precarga lo que ya tiene (auditoría F3, R2)", () => {
  it("los ejemplos guardados llegan puestos: corregir no obliga a reescribirlos", () => {
    render(
      <HsmTemplateForm
        channelId="ch1"
        templates={[]}
        editing={template({
          components: [{ type: "BODY", text: "Hola {{1}}, tenemos algo para ti hoy.", example: { body_text: [["Ana"]] } }],
        })}
        {...handlers()}
      />,
    );

    expect(screen.getByLabelText("Ejemplo de la variable 1")).toHaveValue("Ana");
    expect(within(screen.getByRole("contentinfo")).queryByText(/Falta el ejemplo/)).not.toBeInTheDocument();
  });
});

describe("empieza desde", () => {
  it("una sugerida de axi llena el texto, sus ejemplos y el nombre, y la fila se pliega", () => {
    renderNew();
    fireEvent.click(screen.getByRole("button", { name: /Retomar conversación/ }));

    expect(screen.getByPlaceholderText(/Hola \{\{1\}\}, te escribo/)).toHaveValue(
      "Hola {{1}}, te escribo por {{2}}. ¿Seguimos? Si prefieres que no te contactemos, respóndenos «no».",
    );
    expect(screen.getByLabelText("Ejemplo de la variable 1")).toHaveValue("Ana");
    expect(screen.getAllByText("seguimiento_retomar_v1").length).toBeGreaterThan(0);
    expect(screen.getByText(/desde «Retomar conversación»/)).toBeInTheDocument();
  });

  it("no aparece al editar: el punto de partida es la plantilla misma", () => {
    render(<HsmTemplateForm channelId="ch1" templates={[]} editing={template()} {...handlers()} />);
    expect(screen.queryByText("Empieza desde")).not.toBeInTheDocument();
  });
});

describe("quitar una pieza al editar", () => {
  it("manda el pie VACÍO, porque omitirlo lo conservaría", async () => {
    // Editar reemplaza todos los componentes en Meta: omitir la clave no quita nada.
    render(
      <HsmTemplateForm
        channelId="ch1"
        templates={[]}
        editing={template({
          components: [
            { type: "BODY", text: "Hola {{1}}, tenemos algo para ti hoy." },
            { type: "FOOTER", text: "Responde SALIR para no recibir más" },
          ],
        })}
        {...handlers()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Ejemplo de la variable 1"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByRole("button", { name: "Quitar el pie" }));
    fireEvent.click(screen.getByRole("button", { name: /Guardar y reenviar/ }));

    await waitFor(() => expect(api.updateHsmTemplate).toHaveBeenCalled());
    expect(api.updateHsmTemplate.mock.calls[0][1]).toMatchObject({ footer: null });
  });

  it("pero OMITE la cabecera de imagen, que la página aún no enseña", async () => {
    render(
      <HsmTemplateForm
        channelId="ch1"
        templates={[]}
        editing={template({
          components: [
            { type: "HEADER", format: "IMAGE", example: { header_handle: ["4::aW1h"] } },
            { type: "BODY", text: "Hola {{1}}, tenemos algo para ti hoy." },
          ],
        })}
        {...handlers()}
      />,
    );
    expect(screen.getByText("Se conserva la cabecera multimedia que ya tiene.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Ejemplo de la variable 1"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByRole("button", { name: /Guardar y reenviar/ }));

    await waitFor(() => expect(api.updateHsmTemplate).toHaveBeenCalled());
    expect(api.updateHsmTemplate.mock.calls[0][1]).not.toHaveProperty("header");
  });
});

describe("enviar una plantilla nueva (incidente 2026-09-28)", () => {
  it("dos clics seguidos mandan UN solo POST: el segundo crearía en Meta otra vez", async () => {
    let resolve: (value: unknown) => void = () => undefined;
    api.createHsmTemplate.mockImplementation(() => new Promise((done) => (resolve = done)));
    renderNew();
    fill();

    const button = screen.getByRole("button", { name: "Enviar a revisión de Meta" });
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(api.createHsmTemplate).toHaveBeenCalledTimes(1));
    resolve(template());
  });

  it("al guardar avisa, deja de estar sucia y vuelve a la lista", async () => {
    const props = renderNew();
    fill();
    send();

    await waitFor(() => expect(props.onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: "nueva" })));
    expect(props.onDirtyChange).toHaveBeenLastCalledWith(false);
    expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ title: "Enviada a revisión de Meta" }));
  });

  it("409 con la plantilla aquí: lo dice DENTRO de la página, recarga la lista y ofrece la siguiente versión", async () => {
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
    renderNew();
    fill();
    send();

    expect(await screen.findByText("Ya tienes «sesion_en_vivo_v1» (es_CO) en este canal")).toBeInTheDocument();
    expect(api.listHsmTemplates).toHaveBeenCalled();
    // El aviso no es flotante: se queda hasta que el operador actúe.
    expect(showAlert).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Usar sesion_en_vivo_v2" }));
    expect(screen.getAllByText("sesion_en_vivo_v2").length).toBeGreaterThan(0);
    expect(screen.queryByText(/en este canal$/)).not.toBeInTheDocument();
  });

  it("409 sin la fila aquí (Graph 2388024): Meta ya la tiene, se ofrece sincronizar", async () => {
    api.createHsmTemplate.mockRejectedValue(
      new HttpError({ status: 409, code: "channels/template_exists", message: "Meta ya tiene una plantilla" }),
    );
    const props = renderNew();
    fill();
    send();

    expect(await screen.findByText("Meta ya tiene una plantilla con ese nombre e idioma")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sincronizar con Meta" }));
    expect(props.onSync).toHaveBeenCalled();
  });

  it("Meta no responde bien (502): dice lo que respondió y la referencia para su soporte", async () => {
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
    renderNew();
    fill();
    send();

    expect(await screen.findByText("No pudimos hablar con Meta")).toBeInTheDocument();
    expect(screen.getByText(/Meta respondió: «Invalid parameter»/)).toBeInTheDocument();
    expect(screen.getByText("AxE78QRNA4o")).toBeInTheDocument();
  });

  // Incidente 2026-09-28 p. m.: recrear una borrada daba 502 «Invalid parameter».
  it("409 nombre reservado: dice hasta cuándo, el selector salta solo a la v2 y la marca como reservada", async () => {
    api.createHsmTemplate.mockRejectedValue(
      new HttpError({
        status: 409,
        code: "channels/template_name_locked",
        message: "reservado",
        problem: {
          type: "t",
          title: "Meta tiene reservado ese nombre",
          status: 409,
          code: "channels/template_name_locked",
          details: { locked_until: "2026-10-28T17:00:00.000Z", estimated: false },
        },
      }),
    );
    renderNew();
    fill();
    send();

    expect(await screen.findByText(/Meta tiene reservado «sesion_en_vivo_v1» \(es_CO\) hasta el 28/)).toBeInTheDocument();
    expect(api.createHsmTemplate).toHaveBeenCalledTimes(1);
    // La versión reservada queda fuera: lo que se enviaría ya es la v2.
    expect(screen.getAllByText("sesion_en_vivo_v2").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Usar sesion_en_vivo_v2" }));
    expect(screen.getAllByText("sesion_en_vivo_v2").length).toBeGreaterThan(0);
  });

  it("422 formato de cabecera: el motivo en español, lo que dijo Meta y abre el paso del mensaje", async () => {
    api.createHsmTemplate.mockRejectedValue(
      new HttpError({
        status: 422,
        code: "channels/template_rejected",
        message: "rechazada",
        problem: {
          type: "t",
          title: "Meta no aceptó la plantilla",
          status: 422,
          code: "channels/template_rejected",
          details: { reason_code: "header_format", user_msg: "Header format is incorrect", fbtrace_id: "Ax9" },
        },
      }),
    );
    renderNew();
    fill();
    // El paso del mensaje se pliega antes de enviar: el rechazo tiene que volver a abrirlo.
    // El paso, no el tramo de la isla que también se llama «El mensaje»: el paso se pliega.
    const step = () =>
      screen.getAllByRole("button", { name: /El mensaje/ }).find((button) => button.hasAttribute("aria-expanded")) as HTMLElement;
    fireEvent.click(step());
    expect(step()).toHaveAttribute("aria-expanded", "false");
    send();

    expect(await screen.findByText("El formato de la cabecera no le vale a Meta")).toBeInTheDocument();
    expect(screen.getByText(/Meta dijo: «Header format is incorrect»/)).toBeInTheDocument();
    expect(step()).toHaveAttribute("aria-expanded", "true");
  });

  it("sin respuesta: no deja reenviar a ciegas; mira la lista y, si llegó, vuelve a ella", async () => {
    // El incidente: la respuesta se perdió, el operador reenvió y Meta dijo «ya existe».
    api.createHsmTemplate.mockRejectedValue(new TypeError("Failed to fetch"));
    api.listHsmTemplates.mockResolvedValue([template({ id: "llego", name: "sesion_en_vivo_v1", language: "es_CO" })]);
    const props = renderNew();
    fill();
    send();

    expect(await screen.findByText("No sabemos si Meta la recibió")).toBeInTheDocument();
    // La recarga de la lista ya marca la v1 en uso y el selector salta a la v2:
    // aun así se busca la que SE ENVIÓ (la trampa del incidente).
    await waitFor(() => expect(screen.getAllByText("sesion_en_vivo_v2").length).toBeGreaterThan(0));
    expect(screen.getByRole("button", { name: "Enviar a revisión de Meta" })).toHaveAttribute("aria-disabled", "true");
    send();
    expect(api.createHsmTemplate).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Actualizar la lista" }));
    await waitFor(() => expect(props.onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: "llego" })));
    expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ title: "Ya llegó a Meta" }));
  });
});

describe("antes de enviar y la isla", () => {
  it("la vista previa enseña el mensaje entero: también el pie", () => {
    renderNew();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Añadir pie" }));
    fireEvent.change(screen.getByLabelText("Texto del pie"), { target: { value: "Responde SALIR" } });
    // Dos previas (la plegable del celular y la columna de escritorio): las dos lo muestran.
    expect(screen.getAllByText("Responde SALIR").length).toBeGreaterThanOrEqual(2);
  });

  it("un pie añadido y vacío no se envía: se pide escribirlo o quitarlo", () => {
    renderNew();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Añadir pie" }));
    send();

    expect(screen.getAllByText("Escribe el pie o quítalo").length).toBeGreaterThan(0);
    expect(api.createHsmTemplate).not.toHaveBeenCalled();
  });

  it("nombra lo que falta: el ejemplo exacto, no «hay errores»", () => {
    renderNew();
    fill("Promo", "Hola {{1}}, tienes {{2}} de descuento hasta el domingo.");
    fireEvent.change(screen.getByLabelText("Ejemplo de la variable 1"), { target: { value: "Ana" } });

    const dock = screen.getByRole("contentinfo");
    expect(within(dock).getByText("Casi lista")).toBeInTheDocument();
    expect(within(dock).getByText("Falta el ejemplo de {{2}}")).toBeInTheDocument();
    // El tramo del mensaje está por corregir y no cuenta: 2 de 3.
    expect(within(dock).getByText("2/3")).toBeInTheDocument();
  });

  it("vacía, la isla dice qué falta para empezar", () => {
    renderNew();
    const dock = screen.getByRole("contentinfo");
    expect(within(dock).getByText("Por empezar")).toBeInTheDocument();
    expect(within(dock).getByText("Falta el texto y el nombre")).toBeInTheDocument();
  });
});
