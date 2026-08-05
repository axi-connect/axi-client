import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { HttpError } from "@/core/api/problem";
import type { FormDefinitionDTO, FormsListDTO } from "@/modules/forms/domain/form";
import { FormsSection } from "../FormsSection";

/**
 * Asertan el MECANISMO de los invariantes que se pagan caros en producción: que
 * un guardado no reactive un formulario pausado, que cambiar de pestaña no
 * pierda el borrador, que la herencia de `order_intake` sea visible y que un 404
 * al eliminar converja en lugar de romper.
 *
 * Las reglas de validación en sí (select sin opciones, tope de 8, codes únicos)
 * se cubren en los tests de `form-definition.config`: aquí solo se comprueba que
 * la UI las respeta y no llega al backend.
 */

const listForms = jest.fn<Promise<FormsListDTO>, []>();
const upsertForm = jest.fn();
const deleteForm = jest.fn();

jest.mock("@/modules/forms/infrastructure/services/form-service.adapter", () => ({
  listForms: () => listForms(),
  upsertForm: (flow: string, input: unknown) => upsertForm(flow, input),
  deleteForm: (flow: string) => deleteForm(flow),
}));

const showAlert = jest.fn();
const showModal = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal, closeModal: jest.fn() }),
}));

let permissions: string[] = ["forms:read", "forms:manage"];
const replace = jest.fn();
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({
    status: "authenticated",
    hasPermission: (code: string) => permissions.includes(code),
  }),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(""),
}));

jest.mock("@/core/hooks/use-mobile", () => ({ useIsMobile: () => false }));

const definition = (
  flow: FormDefinitionDTO["flow"],
  overrides: Partial<FormDefinitionDTO> = {},
): FormDefinitionDTO => ({
  id: `id-${flow}`,
  flow,
  fields: [],
  is_active: true,
  created_at: "2026-08-05T00:00:00.000Z",
  updated_at: "2026-08-05T00:00:00.000Z",
  ...overrides,
});

const CONTACT_WITH_TWO = definition("contact_registration", {
  fields: [
    { code: "full_name", label: "Nombre completo", type: "text", required: true, position: 0 },
    { code: "phone", label: "Teléfono", type: "phone", required: true, position: 1 },
  ],
});

beforeEach(() => {
  jest.clearAllMocks();
  permissions = ["forms:read", "forms:manage"];
  listForms.mockResolvedValue({ data: [] });
  window.history.replaceState(null, "", "/settings/forms");
});

const renderReady = async () => {
  render(<FormsSection />);
  await waitFor(() => expect(listForms).toHaveBeenCalled());
  await screen.findByRole("tab", { name: /datos del cliente/i });
};

/** Radix Tabs usa activación automática: el trigger cambia de pestaña al recibir foco. */
const selectTab = (name: RegExp) => {
  const trigger = screen.getByRole("tab", { name });
  fireEvent.focus(trigger);
  fireEvent.click(trigger);
};

/** Abre el catálogo de datos recomendados. */
const openCatalog = () =>
  fireEvent.click(screen.getByRole("button", { name: /añadir (el primer )?dato/i }));

/** Añade un dato personalizado (en blanco) y le pone nombre. */
const addField = (label: string) => {
  openCatalog();
  fireEvent.click(screen.getByText(/crear un dato personalizado/i));
  fireEvent.change(screen.getByLabelText(/nombre del dato/i), { target: { value: label } });
};

/**
 * El input de `code` vive en un acordeón cerrado por defecto. Se busca por rol
 * `textbox`: el `region` del acordeón también se llama "Clave técnica" (lo
 * etiqueta su trigger), así que `getByLabelText` encontraría dos elementos.
 */
const setCode = (code: string) => {
  fireEvent.click(screen.getByRole("button", { name: /clave técnica/i }));
  fireEvent.change(screen.getByRole("textbox", { name: /clave técnica/i }), {
    target: { value: code },
  });
};

const save = () => fireEvent.click(screen.getByRole("button", { name: /^guardar/i }));

describe("carga", () => {
  it("hace UN solo GET /forms al entrar y ninguno más al cambiar de pestaña", async () => {
    await renderReady();
    expect(listForms).toHaveBeenCalledTimes(1);

    selectTab(/datos del pedido/i);
    selectTab(/datos de la cita/i);

    expect(listForms).toHaveBeenCalledTimes(1);
  });

  it("sintetiza los 3 flujos aunque el backend devuelva una lista vacía", async () => {
    await renderReady();

    for (const name of [/datos del cliente/i, /datos del pedido/i, /datos de la cita/i]) {
      expect(screen.getByRole("tab", { name })).toBeInTheDocument();
    }
    expect(screen.getByText(/tu agente todavía no pide nada/i)).toBeInTheDocument();
  });

  it("un fallo de carga ofrece reintentar y no deja la página vacía", async () => {
    listForms.mockRejectedValueOnce(new Error("boom"));
    render(<FormsSection />);

    const retry = await screen.findByRole("button", { name: /reintentar/i });
    listForms.mockResolvedValue({ data: [] });
    fireEvent.click(retry);

    await screen.findByRole("tab", { name: /datos del cliente/i });
    expect(listForms).toHaveBeenCalledTimes(2);
  });
});

describe("el borrador sobrevive al cambio de pestaña", () => {
  it("lo editado en un flujo sigue ahí al volver", async () => {
    await renderReady();

    addField("Dirección de entrega");
    expect(screen.getByDisplayValue("Dirección de entrega")).toBeInTheDocument();

    selectTab(/datos del pedido/i);
    expect(screen.queryByDisplayValue("Dirección de entrega")).not.toBeInTheDocument();

    selectTab(/datos del cliente/i);
    expect(screen.getByDisplayValue("Dirección de entrega")).toBeInTheDocument();
  });
});

describe("guardado", () => {
  it("un formulario PAUSADO no se reactiva al guardar (is_active: false viaja explícito)", async () => {
    listForms.mockResolvedValue({
      data: [
        definition("contact_registration", {
          is_active: false,
          fields: [{ code: "phone", label: "Teléfono", type: "phone", required: true, position: 0 }],
        }),
      ],
    });
    upsertForm.mockResolvedValue(definition("contact_registration", { is_active: false }));
    await renderReady();

    // Edita la etiqueta SIN tocar el switch, y guarda.
    fireEvent.change(screen.getByLabelText(/nombre del dato/i), { target: { value: "Celular" } });
    save();

    await waitFor(() => expect(upsertForm).toHaveBeenCalled());
    expect(upsertForm.mock.calls[0][1]).toMatchObject({ is_active: false });
  });

  it("deriva position del índice y omite ai_prompt vacío", async () => {
    upsertForm.mockResolvedValue(definition("contact_registration"));
    await renderReady();

    addField("Dirección");
    setCode("address");
    save();

    await waitFor(() => expect(upsertForm).toHaveBeenCalled());
    expect(upsertForm.mock.calls[0][1].fields[0]).toEqual({
      code: "address",
      label: "Dirección",
      type: "text",
      required: true,
      position: 0,
    });
  });

  it("envía ai_prompt cuando tiene contenido", async () => {
    upsertForm.mockResolvedValue(definition("contact_registration"));
    await renderReady();

    addField("Dirección");
    setCode("address");
    fireEvent.change(screen.getByLabelText(/cómo debe preguntarlo/i), {
      target: { value: "Pide calle y barrio" },
    });
    save();

    await waitFor(() => expect(upsertForm).toHaveBeenCalled());
    expect(upsertForm.mock.calls[0][1].fields[0]).toMatchObject({
      ai_prompt: "Pide calle y barrio",
    });
  });

  it("bloquea el guardado con un code inválido y ancla el mensaje al campo", async () => {
    await renderReady();

    addField("Dirección");
    setCode("1mal");
    save();

    await waitFor(() => expect(screen.getByText(/debe empezar por una letra/i)).toBeInTheDocument());
    expect(upsertForm).not.toHaveBeenCalled();
  });

  it("bloquea el guardado con un code duplicado, señalando la segunda fila", async () => {
    listForms.mockResolvedValue({ data: [CONTACT_WITH_TWO] });
    await renderReady();

    // Añade una fila nueva con un code que ya usa otra.
    fireEvent.click(screen.getByRole("button", { name: /añadir dato/i }));
    fireEvent.change(screen.getByLabelText(/nombre del dato/i), { target: { value: "Otro" } });
    setCode("phone");
    save();

    await waitFor(() => expect(screen.getByText(/ya la usa otro dato/i)).toBeInTheDocument());
    expect(upsertForm).not.toHaveBeenCalled();
  });

  it("un error del servidor conserva el borrador intacto", async () => {
    upsertForm.mockRejectedValue(new Error("500"));
    await renderReady();

    addField("Dirección");
    setCode("address");
    save();

    await waitFor(() =>
      expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" })),
    );
    expect(screen.getByDisplayValue("Dirección")).toBeInTheDocument();
  });
});

describe("eliminar", () => {
  it("un 404 converge al estado vacío en lugar de mostrar error", async () => {
    listForms.mockResolvedValue({ data: [CONTACT_WITH_TWO] });
    deleteForm.mockRejectedValue(
      new HttpError({
        status: 404,
        code: "forms/not_found",
        message: "no existe",
        problem: { type: "x", title: "Not Found", status: 404, code: "forms/not_found" },
      }),
    );
    await renderReady();

    fireEvent.click(screen.getByRole("button", { name: /más acciones/i }));
    fireEvent.click(screen.getByText(/eliminar el formulario/i));

    const config = showModal.mock.calls[0][0];
    const confirm = config.actions.find(
      (action: { id: string }) => action.id === "form-delete-confirm",
    );
    confirm.onClick();

    await waitFor(() =>
      expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" })),
    );
    expect(showAlert).not.toHaveBeenCalledWith(expect.objectContaining({ tone: "error" }));
  });
});

describe("herencia de contact_registration en order_intake", () => {
  it("muestra los campos heredados y el contador combinado de obligatorios", async () => {
    listForms.mockResolvedValue({
      data: [
        CONTACT_WITH_TWO,
        definition("order_intake", {
          fields: [{ code: "notas", label: "Notas", type: "text", required: true, position: 0 }],
        }),
      ],
    });
    await renderReady();

    selectTab(/datos del pedido/i);

    expect(screen.getByText(/antes, tu agente pedirá los datos del cliente/i)).toBeInTheDocument();
    expect(
      screen.getByText(/3 datos obligatorios: 2 del cliente \+ 1 del pedido/i),
    ).toBeInTheDocument();
  });

  it("appointment_booking avisa de que NO hereda", async () => {
    listForms.mockResolvedValue({ data: [CONTACT_WITH_TWO] });
    await renderReady();

    selectTab(/datos de la cita/i);
    expect(screen.getByText(/la cita no hereda los datos del cliente/i)).toBeInTheDocument();
  });
});

describe("reordenar", () => {
  it("los botones de flecha mueven el dato y lo anuncian a lectores de pantalla", async () => {
    listForms.mockResolvedValue({ data: [CONTACT_WITH_TWO] });
    await renderReady();

    fireEvent.click(screen.getByRole("button", { name: /bajar nombre completo/i }));

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Teléfono");
    expect(screen.getByText(/nombre completo pasó a la posición 2 de 2/i)).toBeInTheDocument();
  });

  it("el primero no se puede subir y el último no se puede bajar", async () => {
    listForms.mockResolvedValue({ data: [CONTACT_WITH_TWO] });
    await renderReady();

    expect(screen.getByRole("button", { name: /subir nombre completo/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /bajar teléfono/i })).toBeDisabled();
  });

  it("reordenar manda las position renumeradas al guardar", async () => {
    listForms.mockResolvedValue({ data: [CONTACT_WITH_TWO] });
    upsertForm.mockResolvedValue(CONTACT_WITH_TWO);
    await renderReady();

    fireEvent.click(screen.getByRole("button", { name: /bajar nombre completo/i }));
    save();

    await waitFor(() => expect(upsertForm).toHaveBeenCalled());
    expect(upsertForm.mock.calls[0][1].fields).toEqual([
      expect.objectContaining({ code: "phone", position: 0 }),
      expect.objectContaining({ code: "full_name", position: 1 }),
    ]);
  });
});

describe("catálogo de datos recomendados", () => {
  it("un dato elegido del catálogo llega precargado y se guarda con su code del CRM", async () => {
    upsertForm.mockResolvedValue(definition("contact_registration"));
    await renderReady();

    openCatalog();
    fireEvent.click(screen.getByText("Teléfono"));

    // Sin tocar la clave técnica: viene del catálogo.
    expect(screen.getByDisplayValue("Teléfono")).toBeInTheDocument();
    save();

    await waitFor(() => expect(upsertForm).toHaveBeenCalled());
    expect(upsertForm.mock.calls[0][1].fields[0]).toMatchObject({
      code: "phone",
      label: "Teléfono",
      type: "phone",
      ai_prompt: expect.stringContaining("indicativo"),
    });
  });

  it("un dato que ya se pide aparece como «Ya lo pides» y no se puede volver a añadir", async () => {
    listForms.mockResolvedValue({ data: [CONTACT_WITH_TWO] });
    await renderReady();

    openCatalog();
    expect(screen.getAllByText(/ya lo pides/i).length).toBe(2); // full_name y phone
  });

  it("no ofrece document_type (un select con el enum cc|ce|ti|pp|nit se leería literal al cliente)", async () => {
    await renderReady();

    openCatalog();
    expect(screen.queryByText("document_type")).not.toBeInTheDocument();
    expect(screen.getByText("document_number")).toBeInTheDocument();
  });
});

describe("«Así lo lee tu agente»", () => {
  it("muestra la línea real del prompt y se actualiza al escribir la indicación", async () => {
    await renderReady();

    addField("Dirección");
    setCode("address");
    expect(screen.getByText("- Dirección (code address): FALTA")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/cómo debe preguntarlo/i), {
      target: { value: "Pide calle y barrio" },
    });
    expect(
      screen.getByText("- Dirección (code address): FALTA (Pide calle y barrio)"),
    ).toBeInTheDocument();
  });

  it("marca los opcionales con [opcional]", async () => {
    await renderReady();

    addField("Dirección");
    setCode("address");
    fireEvent.click(screen.getByRole("switch", { name: /obligatorio/i }));

    expect(
      screen.getByText("- Dirección (code address) [opcional]: FALTA"),
    ).toBeInTheDocument();
  });
});

describe("vista previa de conversación", () => {
  const openPreview = () => {
    fireEvent.click(screen.getByRole("button", { name: /más acciones/i }));
    fireEvent.click(screen.getByText(/ver conversación de ejemplo/i));
  };

  it("en order_intake incluye los datos heredados del cliente", async () => {
    listForms.mockResolvedValue({
      data: [
        CONTACT_WITH_TWO,
        definition("order_intake", {
          fields: [{ code: "notas", label: "Notas", type: "text", required: true, position: 0 }],
        }),
      ],
    });
    await renderReady();

    selectTab(/datos del pedido/i);
    openPreview();

    await screen.findByText(/cómo se verá en whatsapp/i);
    const sheet = within(screen.getByRole("dialog"));

    // 3 preguntas: los 2 heredados del cliente + 1 del pedido.
    expect(sheet.getAllByRole("listitem")).toHaveLength(3);
    expect(sheet.getByText(/nombre completo/i)).toBeInTheDocument();
    expect(sheet.getByText(/notas/i)).toBeInTheDocument();
  });

  it("avisa cuando hay 5 o más obligatorios", async () => {
    listForms.mockResolvedValue({
      data: [
        definition("contact_registration", {
          fields: ["a", "b", "c", "d", "e"].map((code, position) => ({
            code,
            label: `Dato ${code.toUpperCase()}`,
            type: "text" as const,
            required: true,
            position,
          })),
        }),
      ],
    });
    await renderReady();

    openPreview();

    expect(await screen.findByText(/5 datos obligatorios son 5 preguntas/i)).toBeInTheDocument();
  });

  it("no avisa con menos de 5 obligatorios", async () => {
    listForms.mockResolvedValue({ data: [CONTACT_WITH_TWO] });
    await renderReady();

    openPreview();

    await screen.findByText(/cómo se verá en whatsapp/i);
    expect(screen.queryByText(/preguntas antes de poder cobrar/i)).not.toBeInTheDocument();
  });

  it("lleva disclaimer: no promete la pregunta literal", async () => {
    listForms.mockResolvedValue({ data: [CONTACT_WITH_TWO] });
    await renderReady();

    openPreview();

    expect(await screen.findByText(/ejemplo aproximado/i)).toBeInTheDocument();
  });
});

describe("permisos", () => {
  it("sin forms:manage es una ficha de solo lectura, sin controles de escritura", async () => {
    permissions = ["forms:read"];
    listForms.mockResolvedValue({ data: [CONTACT_WITH_TWO] });
    await renderReady();

    expect(screen.getByText(/solo lectura/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /añadir dato/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^guardar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reordenar/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/nombre del dato/i)).not.toBeInTheDocument();
    // Renderiza la ficha <dl>, no inputs deshabilitados.
    expect(screen.getByText("Tipo de dato")).toBeInTheDocument();
    expect(screen.getAllByText("Nombre completo").length).toBeGreaterThan(0);
  });

  it("sin forms:read redirige fuera de la sección", async () => {
    permissions = [];
    render(<FormsSection />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    expect(listForms).not.toHaveBeenCalled();
  });
});
