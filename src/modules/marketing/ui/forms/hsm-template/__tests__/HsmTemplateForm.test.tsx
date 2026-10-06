import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { HttpError } from "@/core/api/problem";
import type { HsmLibraryTemplateDTO, HsmTemplateDTO } from "@/modules/marketing/domain/template-catalog";
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
  listHsmLibrary: jest.fn(),
  uploadHsmHeaderMedia: jest.fn(),
}));

// jsdom no tiene object URLs: la previa local del archivo elegido.
URL.createObjectURL = jest.fn(() => "blob:previa-local");
URL.revokeObjectURL = jest.fn();

/* eslint-disable @typescript-eslint/no-require-imports */
const api = require("@/modules/marketing/infrastructure/services/templates-service.adapter") as {
  createHsmTemplate: jest.Mock;
  updateHsmTemplate: jest.Mock;
  listHsmTemplates: jest.Mock;
  listHsmLibrary: jest.Mock;
  uploadHsmHeaderMedia: jest.Mock;
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
  api.listHsmLibrary.mockResolvedValue([]);
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

// Con aprobación al instante (biblioteca intacta) el botón dice «Crear plantilla».
const send = () => fireEvent.click(screen.getByRole("button", { name: /^(Enviar a revisión de Meta|Crear plantilla)$/ }));

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

  it("una cabecera de imagen creada FUERA de axi: lo dice, y editar el texto la conserva sin mandarla", async () => {
    // Sin copia de axi (`header_media` null) no se puede reenviar: se invita a
    // subirla, pero editar el cuerpo no puede quedar bloqueado por eso.
    render(
      <HsmTemplateForm
        channelId="ch1"
        templates={[]}
        editing={template({
          components: [
            { type: "HEADER", format: "IMAGE", example: { header_handle: ["https://scontent.whatsapp.net/x"] } },
            { type: "BODY", text: "Hola {{1}}, tenemos algo para ti hoy." },
          ],
          header_media: null,
        })}
        {...handlers()}
      />,
    );
    expect(screen.getByText(/Esta cabecera se creó fuera de axi/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Ejemplo de la variable 1"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByRole("button", { name: /Guardar y reenviar/ }));

    await waitFor(() => expect(api.updateHsmTemplate).toHaveBeenCalled());
    expect(api.updateHsmTemplate.mock.calls[0][1]).not.toHaveProperty("header");
    expect(api.updateHsmTemplate.mock.calls[0][1]).not.toHaveProperty("header_media");
  });

  it("sin copia, «Antes de enviar» lo AVISA (no bloquea) y la isla lo nombra (auditoría F4, R1)", async () => {
    // Guardar es válido, pero cada envío saldría sin la cabecera y Meta lo
    // rechazaría: el operador no puede creerla «Lista» sin más.
    render(
      <HsmTemplateForm
        channelId="ch1"
        templates={[]}
        editing={template({
          components: [
            { type: "HEADER", format: "IMAGE", example: { header_handle: ["https://scontent.whatsapp.net/x"] } },
            { type: "BODY", text: "Hola, tenemos algo para ti hoy." },
          ],
          body: "Hola, tenemos algo para ti hoy.",
          header_media: null,
        })}
        {...handlers()}
      />,
    );

    const warning = screen.getByRole("region", { name: "Se puede enviar, con un aviso" });
    expect(warning).toHaveTextContent(/se creó fuera de axi y no tenemos su archivo: los envíos saldrían sin ella/);
    expect(screen.queryByText("Lista para enviar a revisión")).not.toBeInTheDocument();
    expect(screen.getByText("Sin el archivo, la imagen no sale en los envíos")).toBeInTheDocument();
    // No bloquea: el botón sigue activo
    expect(screen.getByRole("button", { name: /Guardar y reenviar/ })).not.toHaveAttribute("aria-disabled", "true");

    // «Subir el archivo» lleva el foco al subidor
    fireEvent.click(screen.getByRole("button", { name: "Subir el archivo" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Arrastra una imagen/ })).toHaveFocus());
  });

  it("con su copia de axi no hay aviso", () => {
    render(
      <HsmTemplateForm
        channelId="ch1"
        templates={[]}
        editing={template({
          components: [
            { type: "HEADER", format: "IMAGE", example: { header_handle: ["4::aW"] } },
            { type: "BODY", text: "Hola, tenemos algo para ti hoy." },
          ],
          body: "Hola, tenemos algo para ti hoy.",
          header_media: {
            mode: "fixed",
            kind: "image",
            storage_key: "companies/c1/hsm_templates/obj",
            mime_type: "image/jpeg",
            byte_size: 412_000,
            handle: "4::aW",
            file_name: "coleccion.jpg",
            preview_url: "https://s3.test/firmada",
          },
        })}
        {...handlers()}
      />,
    );

    expect(screen.queryByText(/se creó fuera de axi/)).not.toBeInTheDocument();
    expect(screen.getByText("Lista para enviar a revisión")).toBeInTheDocument();
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

describe("cabecera de imagen, video o documento (F4)", () => {
  const UPLOADED = {
    handle: "4:cHJvbW8uanBn:aW1hZ2UvanBlZw==:ARb",
    storage_key: "companies/c1/hsm_templates/019fec79-0000-7000-8000-000000000001",
    kind: "image" as const,
    mime_type: "image/jpeg",
    byte_size: 412_000,
    file_name: "coleccion-temporada.jpg",
    preview_url: "https://s3.test/firmada",
  };
  const jpg = () => new File([new Uint8Array(412_000)], "coleccion-temporada.jpg", { type: "image/jpeg" });
  const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;

  function chooseImage() {
    fireEvent.click(screen.getByRole("radio", { name: /Imagen/ }));
  }

  it("una imagen válida se sube, enseña «Va en cada envío» y viaja con su copia de axi", async () => {
    api.uploadHsmHeaderMedia.mockResolvedValue(UPLOADED);
    renderNew();
    fill();
    chooseImage();
    fireEvent.change(fileInput(), { target: { files: [jpg()] } });

    expect(await screen.findByText(/Va en cada envío/)).toBeInTheDocument();
    expect(api.uploadHsmHeaderMedia).toHaveBeenCalledWith("ch1", expect.any(File));
    expect(screen.getByText("coleccion-temporada.jpg")).toBeInTheDocument();

    send();
    await waitFor(() => expect(api.createHsmTemplate).toHaveBeenCalled());
    expect(api.createHsmTemplate.mock.calls[0][0]).toMatchObject({
      header: { format: "image", handle: UPLOADED.handle },
      header_media: {
        mode: "fixed",
        kind: "image",
        storage_key: UPLOADED.storage_key,
        mime_type: "image/jpeg",
        byte_size: 412_000,
        handle: UPLOADED.handle,
        file_name: "coleccion-temporada.jpg",
      },
    });
  });

  it("un WebP se rechaza en el navegador, con el motivo, sin subir nada", () => {
    renderNew();
    chooseImage();
    fireEvent.change(fileInput(), { target: { files: [new File(["x"], "banner.webp", { type: "image/webp" })] } });

    expect(screen.getByText("«banner.webp» es WebP. En la cabecera, Meta solo acepta JPG o PNG.")).toHaveAttribute("role", "alert");
    expect(api.uploadHsmHeaderMedia).not.toHaveBeenCalled();
  });

  it("si Meta rechaza la subida, lo dice y deja elegir otro", async () => {
    api.uploadHsmHeaderMedia.mockRejectedValue(new Error("boom"));
    renderNew();
    chooseImage();
    fireEvent.change(fileInput(), { target: { files: [jpg()] } });

    expect(await screen.findByText(/no se guardó nada/)).toHaveAttribute("role", "alert");
    expect(screen.getByText("Elige otro archivo")).toBeInTheDocument();
  });

  it("elegir imagen y no subir nada no deja enviar: se aprobaría y no se podría mandar", () => {
    renderNew();
    fill();
    chooseImage();
    send();

    expect(api.createHsmTemplate).not.toHaveBeenCalled();
    expect(screen.getAllByText("Sube el archivo de la cabecera o quítala").length).toBeGreaterThan(0);
  });

  it("al editar, el medio guardado se enseña y, sin tocarlo, no se manda: el servidor lo conserva", async () => {
    render(
      <HsmTemplateForm
        channelId="ch1"
        templates={[]}
        editing={template({
          components: [
            { type: "HEADER", format: "IMAGE", example: { header_handle: [UPLOADED.handle] } },
            { type: "BODY", text: "Hola {{1}}, tenemos algo para ti hoy." },
          ],
          header_media: { ...UPLOADED, mode: "fixed" },
        })}
        {...handlers()}
      />,
    );
    expect(screen.getByText("coleccion-temporada.jpg")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Ejemplo de la variable 1"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByRole("button", { name: /Guardar y reenviar/ }));

    await waitFor(() => expect(api.updateHsmTemplate).toHaveBeenCalled());
    expect(api.updateHsmTemplate.mock.calls[0][1]).not.toHaveProperty("header");
    expect(api.updateHsmTemplate.mock.calls[0][1]).not.toHaveProperty("header_media");
  });

  it("reemplazar el medio guardado manda el nuevo, con su handle", async () => {
    const replaced = { ...UPLOADED, storage_key: UPLOADED.storage_key.replace(/1$/, "2"), handle: "4:nuevo" };
    api.uploadHsmHeaderMedia.mockResolvedValue(replaced);
    render(
      <HsmTemplateForm
        channelId="ch1"
        templates={[]}
        editing={template({
          components: [
            { type: "HEADER", format: "IMAGE", example: { header_handle: [UPLOADED.handle] } },
            { type: "BODY", text: "Hola {{1}}, tenemos algo para ti hoy." },
          ],
          header_media: { ...UPLOADED, mode: "fixed" },
        })}
        {...handlers()}
      />,
    );
    fireEvent.change(fileInput(), { target: { files: [jpg()] } });
    await waitFor(() => expect(api.uploadHsmHeaderMedia).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText("Ejemplo de la variable 1"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByRole("button", { name: /Guardar y reenviar/ }));

    await waitFor(() => expect(api.updateHsmTemplate).toHaveBeenCalled());
    expect(api.updateHsmTemplate.mock.calls[0][1]).toMatchObject({
      header: { format: "image", handle: "4:nuevo" },
      header_media: { storage_key: replaced.storage_key, handle: "4:nuevo" },
    });
  });

  it("pasar la cabecera de imagen a ninguna al editar la QUITA (null), no la conserva", async () => {
    render(
      <HsmTemplateForm
        channelId="ch1"
        templates={[]}
        editing={template({
          components: [
            { type: "HEADER", format: "IMAGE", example: { header_handle: [UPLOADED.handle] } },
            { type: "BODY", text: "Hola {{1}}, tenemos algo para ti hoy." },
          ],
          header_media: { ...UPLOADED, mode: "fixed" },
        })}
        {...handlers()}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: /Ninguna/ }));
    fireEvent.change(screen.getByLabelText("Ejemplo de la variable 1"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByRole("button", { name: /Guardar y reenviar/ }));

    await waitFor(() => expect(api.updateHsmTemplate).toHaveBeenCalled());
    expect(api.updateHsmTemplate.mock.calls[0][1]).toMatchObject({ header: null });
  });
});

describe("biblioteca de Meta (F5)", () => {
  /** La muestra real del servidor. */
  const AUTO_PAY: HsmLibraryTemplateDTO = {
    name: "auto_pay_reminder_1",
    language: "es",
    topic: "PAYMENTS",
    usecase: "AUTO_PAY_REMINDER",
    industries: ["FINANCIAL_SERVICES"],
    header: "Próximo pago automático",
    header_example: null,
    body:
      "Hola, {{1}}: \n\nTu pago automático de {{2}} está programado para el {{3}} en la cuenta {{4}}.\n\nAsegúrate de tener saldo suficiente para evitar cargos por {{5}}.",
    body_examples: ["John", "$12,34", "1 de enero de 2024", "CS Mutual Checking", "retraso"],
    footer: null,
    buttons: [{ type: "url", text: "Ver cuenta", url: "https://www.example.com" }],
  };
  const body = () => screen.getByPlaceholderText(/Hola \{\{1\}\}, te escribo/);

  async function pickAutoPay() {
    api.listHsmLibrary.mockResolvedValue([AUTO_PAY]);
    const props = renderNew();
    fireEvent.click(await screen.findByRole("button", { name: /Próximo pago automático/ }));
    return props;
  }

  function typeOwnUrl(url = "https://savage.co/cuenta") {
    fireEvent.change(screen.getByLabelText("Dirección del botón 1"), { target: { value: url } });
  }

  it("se pide al abrir la página de crear, del canal; al editar, no", () => {
    renderNew();
    expect(api.listHsmLibrary).toHaveBeenCalledWith("ch1");
    jest.clearAllMocks();
    render(<HsmTemplateForm channelId="ch1" templates={[]} editing={template()} {...handlers()} />);
    expect(api.listHsmLibrary).not.toHaveBeenCalled();
  });

  it("elegirla llena el formulario: texto, ejemplos, cabecera, botón, Utilidad, `es` y el nombre", async () => {
    await pickAutoPay();

    expect(body()).toHaveValue(AUTO_PAY.body);
    expect(screen.getByLabelText("Ejemplo de la variable 1")).toHaveValue("John");
    expect(screen.getByLabelText("Ejemplo de la variable 5")).toHaveValue("retraso");
    expect(screen.getByLabelText("Texto de la cabecera")).toHaveValue("Próximo pago automático");
    expect(screen.getByLabelText("Dirección del botón 1")).toHaveValue("https://www.example.com");
    expect(screen.getAllByText("proximo_pago_automatico_v1").length).toBeGreaterThan(0);
    expect(screen.getByText(/desde «Próximo pago automático»/)).toBeInTheDocument();
    expect(screen.getByText(/· Biblioteca de Meta/)).toBeInTheDocument();
    expect(screen.getByText(/va en español neutro \(es\)/)).toBeInTheDocument();
  });

  it("con el enlace de ejemplo de Meta no se envía, y lo nombra en «Antes de enviar» y en la isla", async () => {
    await pickAutoPay();
    send();

    expect(api.createHsmTemplate).not.toHaveBeenCalled();
    const message = "Pon la dirección de tu negocio en «Ver cuenta»";
    expect(within(screen.getByRole("region", { name: "Antes de enviar" })).getByText(message)).toBeInTheDocument();
    expect(within(screen.getByRole("contentinfo")).getByText(message)).toBeInTheDocument();
  });

  it("con su enlace y sin tocar el texto: viaja con `library_template_name`, Utilidad y `es`", async () => {
    await pickAutoPay();
    typeOwnUrl();

    expect(screen.getByText(/Aprobación inmediata: es de la biblioteca de Meta/)).toBeInTheDocument();
    expect(within(screen.getByRole("contentinfo")).getByText("Se aprueba al instante")).toBeInTheDocument();
    // No va «a revisión»: el botón dice lo que pasa
    expect(screen.getByRole("button", { name: "Crear plantilla" })).toBeInTheDocument();
    send();

    await waitFor(() => expect(api.createHsmTemplate).toHaveBeenCalled());
    expect(api.createHsmTemplate.mock.calls[0][0]).toMatchObject({
      library_template_name: "auto_pay_reminder_1",
      category: "utility",
      language: "es",
      name: "proximo_pago_automatico_v1",
      buttons: [{ type: "url", text: "Ver cuenta", url: "https://savage.co/cuenta" }],
    });
  });

  it("si se toca el texto, se avisa y viaja como propia, sin `library_template_name`", async () => {
    await pickAutoPay();
    typeOwnUrl();
    fireEvent.change(body(), { target: { value: `${AUTO_PAY.body} Gracias.` } });

    expect(screen.getByText(/Cambiaste el texto de la biblioteca/)).toBeInTheDocument();
    send();

    await waitFor(() => expect(api.createHsmTemplate).toHaveBeenCalled());
    expect(api.createHsmTemplate.mock.calls[0][0]).not.toHaveProperty("library_template_name");
  });

  it("si la biblioteca no llega, la página sigue: la fila sin sus tarjetas", async () => {
    api.listHsmLibrary.mockRejectedValue(new Error("boom"));
    renderNew();

    await waitFor(() => expect(api.listHsmLibrary).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: /Retomar conversación/ })).toBeInTheDocument();
    expect(screen.queryByText("Biblioteca de Meta")).not.toBeInTheDocument();
  });

  it("«Explorar la biblioteca de Meta» abre la hoja, y usar una la carga", async () => {
    api.listHsmLibrary.mockResolvedValue([AUTO_PAY]);
    renderNew();
    await screen.findByRole("button", { name: /Próximo pago automático/ });

    fireEvent.click(screen.getByRole("button", { name: /Explorar la biblioteca de Meta/ }));
    const sheet = await screen.findByRole("dialog");
    fireEvent.click(within(sheet).getByRole("button", { name: "Próximo pago automático" }));
    fireEvent.click(within(sheet).getByRole("button", { name: "Usar esta plantilla" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(body()).toHaveValue(AUTO_PAY.body);
  });
});
