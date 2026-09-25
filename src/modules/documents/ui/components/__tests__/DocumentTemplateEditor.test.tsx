import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const mockPreview = jest.fn<
  Promise<{ html: string }>,
  [string, unknown, AbortSignal | undefined]
>();
const mockSave = jest.fn<Promise<unknown>, [string, unknown]>();
const mockReset = jest.fn<Promise<unknown>, [string]>();
jest.mock(
  "@/modules/documents/infrastructure/services/documents-service.adapter",
  () => ({
    previewDocumentTemplate: (
      type: string,
      body: unknown,
      signal?: AbortSignal,
    ) => mockPreview(type, body, signal),
    saveDocumentTemplate: (type: string, template: unknown) =>
      mockSave(type, template),
    resetDocumentTemplate: (type: string) => mockReset(type),
  }),
);
const mockShowAlert = jest.fn();
const mockShowModal = jest.fn();
const mockCloseModal = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({
    showAlert: mockShowAlert,
    showModal: mockShowModal,
    closeModal: mockCloseModal,
  }),
}));

import { expectAlertContract } from "@/core/notifications/testing";

import { DocumentTemplateEditor } from "@/modules/documents/ui/components/templates/DocumentTemplateEditor";
import { PREVIEW_DEBOUNCE_MS } from "@/modules/documents/infrastructure/hooks/use-template-preview";
import type {
  BlockCatalogView,
  DocumentTemplateDTO,
  DocumentTypeView,
} from "@/modules/documents/domain/template";

/** El catálogo y las variables vienen del SERVIDOR: la pantalla los pinta. */
const type: DocumentTypeView = {
  code: "contract",
  label: "Contrato",
  issuable: true,
  issue_subject: "order",
  issue_policy: "once",
  regenerable: true,
  default_prefix: "CTR",
  data_domains: ["document", "issuer", "counterparty", "commerce"],
  allowed_blocks: [
    "heading",
    "paragraph",
    "clauses",
    "parties",
    "signatures",
    "divider",
  ],
  required_blocks: ["heading", "signatures"],
  legal_notice: null,
  variables: [
    {
      name: "document_number",
      label: "Número del documento",
      domain: "document",
      kind: "text",
      caution: null,
    },
    {
      name: "contact_name",
      label: "Nombre del cliente",
      domain: "counterparty",
      kind: "text",
      caution: null,
    },
    {
      name: "deposit_amount",
      label: "Abono para reservar",
      domain: "schedule",
      kind: "money",
      caution: {
        reason: "sale vacío en los pedidos sin anticipo",
        use_instead: "payment_terms",
      },
    },
    {
      name: "payment_terms",
      label: "Forma de pago (frase según el plan)",
      domain: "schedule",
      kind: "text",
      caution: null,
    },
  ],
};
const catalog: BlockCatalogView[] = [
  {
    type: "heading",
    label: "Título",
    description: "",
    consumes: [],
    repeat: "template",
    supports_when: false,
    editable: true,
  },
  {
    type: "paragraph",
    label: "Párrafo",
    description: "Texto libre",
    consumes: [],
    repeat: "template",
    supports_when: true,
    editable: true,
  },
  {
    type: "clauses",
    label: "Cláusulas",
    description: "",
    consumes: [],
    repeat: "template",
    supports_when: true,
    editable: true,
  },
  {
    type: "parties",
    label: "Partes",
    description: "",
    consumes: ["issuer"],
    repeat: "none",
    supports_when: false,
    editable: true,
  },
  {
    type: "signatures",
    label: "Firmas",
    description: "",
    consumes: [],
    repeat: "none",
    supports_when: false,
    editable: true,
  },
  {
    type: "divider",
    label: "Línea",
    description: "",
    consumes: [],
    repeat: "template",
    supports_when: false,
    editable: true,
  },
  {
    type: "legal_notice",
    label: "Leyenda legal",
    description: "",
    consumes: [],
    repeat: "none",
    supports_when: false,
    editable: false,
  },
  {
    type: "schedule_table",
    label: "Plan de pagos",
    description: "",
    consumes: ["schedule"],
    repeat: "data",
    supports_when: false,
    editable: true,
  },
];
const current: DocumentTemplateDTO = {
  type_code: "contract",
  slug: "default",
  source: "system",
  version: 0,
  template_version_id: null,
  updated_at: null,
  template: {
    schema_version: 1,
    theme: { accent_color: null },
    blocks: [
      { id: "h", type: "heading", text: "Contrato {{document_number}}" },
      { id: "p", type: "paragraph", text: "Hola {{contact_name}}" },
      {
        id: "c",
        type: "clauses",
        numbered: true,
        items: [
          { title: "Objeto", body: "Uno" },
          { title: null, body: "Dos" },
        ],
      },
      {
        id: "s",
        type: "signatures",
        issuer_label: "Agencia",
        counterparty_label: "Viajero",
        show_date: true,
      },
    ],
  },
};

const HTML =
  "<!doctype html><html><head><style data-fonts></style></head><body>Contrato CTR-2026-0001</body></html>";

describe("DocumentTemplateEditor", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockPreview.mockReset();
    mockSave.mockReset();
    mockPreview.mockResolvedValue({ html: HTML });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("la hoja es un iframe con sandbox vacío, srcDoc y las fuentes del host inyectadas", async () => {
    render(
      <DocumentTemplateEditor
        type={type}
        catalog={catalog}
        current={current}
        onSaved={jest.fn()}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(PREVIEW_DEBOUNCE_MS + 10);
    });
    const frame = await screen.findByTitle("Vista previa del documento");
    expect(frame).toHaveAttribute("sandbox", "");
    expect(frame).toHaveAttribute("referrerpolicy", "no-referrer");
    const srcDoc = frame.getAttribute("srcdoc") ?? "";
    expect(srcDoc).toContain("/fonts/poppins/Poppins-Regular.woff2");
    expect(srcDoc).toContain("/fonts/nexa/Nexa-Heavy.woff2");
    expect(srcDoc).toContain("Contrato CTR-2026-0001");
  });

  it("debounce: tres cambios seguidos son UNA petición, y la anterior en vuelo se aborta", async () => {
    render(
      <DocumentTemplateEditor
        type={type}
        catalog={catalog}
        current={current}
        onSaved={jest.fn()}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(PREVIEW_DEBOUNCE_MS + 10);
    });
    expect(mockPreview).toHaveBeenCalledTimes(1);
    const firstSignal = mockPreview.mock.calls[0]?.[2];

    fireEvent.click(screen.getByRole("button", { name: "Título" }));
    const field = screen.getByLabelText("Texto del título");
    fireEvent.change(field, { target: { value: "Contrato A" } });
    fireEvent.change(field, { target: { value: "Contrato AB" } });
    fireEvent.change(field, { target: { value: "Contrato ABC" } });
    await act(async () => {
      jest.advanceTimersByTime(PREVIEW_DEBOUNCE_MS + 10);
    });
    expect(mockPreview).toHaveBeenCalledTimes(2);
    expect(firstSignal?.aborted).toBe(true);
    const sent = mockPreview.mock.calls[1]?.[1] as {
      template: { blocks: { text?: string }[] };
    };
    expect(sent.template.blocks[0]?.text).toBe("Contrato ABC");
  });

  it("una variable desconocida frena la hoja SIN pedir la previa y bloquea guardar; se aclara cuál y en qué documento", async () => {
    render(
      <DocumentTemplateEditor
        type={type}
        catalog={catalog}
        current={current}
        onSaved={jest.fn()}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(PREVIEW_DEBOUNCE_MS + 10);
    });
    fireEvent.click(screen.getByRole("button", { name: "Título" }));
    fireEvent.change(screen.getByLabelText("Texto del título"), {
      target: { value: "Contrato {{numero_pedido}}" },
    });
    await act(async () => {
      jest.advanceTimersByTime(PREVIEW_DEBOUNCE_MS + 10);
    });
    expect(mockPreview).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert")).toHaveTextContent("{{numero_pedido}}");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "no existe en contrato",
    );
    expect(
      screen.getByRole("button", { name: "Guardar plantilla" }),
    ).toBeDisabled();
    // Y la hoja sigue ahí, con la barra encima: nunca desaparece
    expect(screen.getByTitle("Vista previa del documento")).toBeInTheDocument();
    expect(screen.getByText(/La hoja espera/)).toBeInTheDocument();
  });

  it("QA R3-05: una variable con cautela avisa qué usar en su lugar sin frenar la hoja ni guardar; la propuesta no avisa", async () => {
    render(
      <DocumentTemplateEditor
        type={type}
        catalog={catalog}
        current={current}
        onSaved={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Título" }));
    const field = screen.getByLabelText("Texto del título");
    fireEvent.change(field, {
      target: { value: "Se reserva con un abono de {{deposit_amount}}" },
    });
    await act(async () => {
      jest.advanceTimersByTime(PREVIEW_DEBOUNCE_MS + 10);
    });
    const warning = screen
      .getByText("Esta frase puede salir rota en algunos pedidos")
      .closest('[role="alert"]');
    expect(warning).toHaveTextContent(
      "{{deposit_amount}} sale vacío en los pedidos sin anticipo: usa {{payment_terms}}",
    );
    expect(
      screen.getByRole("button", { name: "Guardar plantilla" }),
    ).toBeEnabled();
    expect(screen.queryByText(/La hoja espera/)).toBeNull();

    fireEvent.change(field, { target: { value: "{{payment_terms}}" } });
    expect(
      screen.queryByText("Esta frase puede salir rota en algunos pedidos"),
    ).toBeNull();
  });

  it("cada cláusula tiene botones con nombre propio: dos «Quitar» iguales serían un defecto de accesibilidad", () => {
    render(
      <DocumentTemplateEditor
        type={type}
        catalog={catalog}
        current={current}
        onSaved={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cláusulas" }));
    expect(
      screen.getByRole("button", { name: "Quitar la cláusula 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Quitar la cláusula 2" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Subir la cláusula 1" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Bajar la cláusula 2" }),
    ).toBeDisabled();
  });

  it("los obligatorios no se quitan; el resto sí, y guardar manda la plantilla editada y crea una versión", async () => {
    const onSaved = jest.fn();
    mockSave.mockResolvedValue({ ...current, source: "tenant", version: 1 });
    render(
      <DocumentTemplateEditor
        type={type}
        catalog={catalog}
        current={current}
        onSaved={onSaved}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /Quitar el bloque Título/ }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Quitar el bloque Firmas/ }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Quitar el bloque Párrafo 2" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Guardar plantilla" }));
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    const sent = mockSave.mock.calls[0]?.[1] as { blocks: { id: string }[] };
    expect(sent.blocks.map((b) => b.id)).toEqual(["h", "c", "s"]);
    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith(
        expect.objectContaining({ version: 1 }),
      ),
    );
    // §9.4: el título fijo cabe en la píldora; el tipo y la versión van al cuerpo
    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: "success",
        title: "Plantilla guardada",
        description: expect.stringMatching(/^Contrato · versión 1\./),
      }),
    );
    expectAlertContract(mockShowAlert.mock.calls[0]?.[0]);
  });

  it("§9.4: «Restablecer» confirma con showModal (no con un Dialog propio) y el aviso cumple el contrato", async () => {
    mockReset.mockResolvedValue({ ...current, source: "system", version: 3 });
    render(
      <DocumentTemplateEditor
        type={type}
        catalog={catalog}
        current={{ ...current, source: "tenant", version: 3 }}
        onSaved={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Restablecer/ }));
    expect(mockShowModal).toHaveBeenCalledTimes(1);
    const config = mockShowModal.mock.calls[0]?.[0] as {
      title: string;
      description: string;
      actions: { label: string; variant?: string; onClick?: () => void }[];
    };
    expect(config.title).toBe("Volver al modelo de Axi");
    expect(config.description).toMatch(
      /Las 3 versiones que escribiste no se borran/,
    );
    expect(config.description).toMatch(/empiezas en la versión 4/);
    const confirm = config.actions.find(
      (action) => action.label === "Restablecer",
    );
    expect(confirm?.variant).toBe("destructive");
    confirm?.onClick?.();
    await waitFor(() => expect(mockReset).toHaveBeenCalledWith("contract"));
    await waitFor(() => expect(mockCloseModal).toHaveBeenCalled());
    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: "success",
        title: "Vuelve el modelo de Axi",
      }),
    );
    expectAlertContract(mockShowAlert.mock.calls[0]?.[0]);
    // Ningún Dialog propio quedó montado
    expect(
      screen.queryByRole("heading", { name: /Volver al modelo de Axi/ }),
    ).toBeNull();
  });

  it("la paleta ofrece solo lo que el tipo admite; lo demás se ve apagado con su razón", () => {
    render(
      <DocumentTemplateEditor
        type={type}
        catalog={catalog}
        current={current}
        onSaved={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Añadir bloque" }));
    expect(
      screen.getByRole("button", { name: "Añadir Párrafo" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Añadir Plan de pagos" }),
    ).toBeDisabled();
    expect(screen.getByText("No cabe en contrato")).toBeInTheDocument();
  });

  it("en el modelo de Axi no hay «Restablecer»: no hay nada a lo que volver", () => {
    render(
      <DocumentTemplateEditor
        type={type}
        catalog={catalog}
        current={current}
        onSaved={jest.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Restablecer/ })).toBeNull();
    expect(
      screen.getByText(/al guardar nace tu versión 1/),
    ).toBeInTheDocument();
  });
});
