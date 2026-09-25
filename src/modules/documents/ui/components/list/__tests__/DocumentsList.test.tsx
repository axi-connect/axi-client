import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { DocumentDTO } from "@/modules/documents/domain/document";

const mockList = jest.fn<
  Promise<{ data: DocumentDTO[]; meta: object }>,
  [unknown]
>();
const mockFileUrl = jest.fn<
  Promise<{ url: string; expires_in_seconds: number }>,
  [string]
>();
const mockIssue = jest.fn();
const mockRegenerate = jest.fn();
const mockRetry = jest.fn();
const mockTypes = jest.fn<Promise<{ types: unknown[] }>, []>();
const mockSendOptions = jest.fn();
const mockSend = jest.fn();
jest.mock(
  "@/modules/documents/infrastructure/services/documents-service.adapter",
  () => ({
    listDocuments: (subject: unknown) => mockList(subject),
    getDocumentFileUrl: (id: string) => mockFileUrl(id),
    issueDocument: (...args: unknown[]) => mockIssue(...args),
    regenerateDocument: (id: string) => mockRegenerate(id),
    retryDocument: (id: string) => mockRetry(id),
    listDocumentTypes: () => mockTypes(),
    getDocumentSendOptions: (id: string) => mockSendOptions(id),
    sendDocument: (...args: unknown[]) => mockSend(...args),
  }),
);
const mockHasPermission = jest.fn<boolean, [string]>(() => true);
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: mockHasPermission }),
}));
let featureOn = true;
let featuresLoaded = true;
jest.mock("@/shared/auth/features.hooks", () => ({
  useFeatures: () => ({ loaded: featuresLoaded, hasFeature: () => featureOn }),
}));
const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert }),
}));
jest.mock("@/core/realtime/use-socket", () => ({
  useSocket: () => ({ socket: null, connected: false }),
  useSocketEvent: () => undefined,
}));

import { expectAlertContract } from "@/core/notifications/testing";
import { DocumentsList } from "@/modules/documents/ui/components/list/DocumentsList";
import { resetDocumentTypesCache } from "@/modules/documents/infrastructure/hooks/use-document-types";

function doc(overrides: Partial<DocumentDTO> = {}): DocumentDTO {
  return {
    id: "d1",
    type_code: "contract",
    type_label: "Contrato",
    tracks_subject_changes: true,
    status: "rendered",
    number: "CTR-2026-0120",
    contact_id: "c1",
    order_id: "o1",
    payment_id: null,
    template_source: "system",
    template_version_id: null,
    size_bytes: 1000,
    page_count: 2,
    rendered_at: "2026-09-16T10:00:00.000Z",
    error_code: null,
    attempts: 1,
    issued_by: "user",
    issued_by_user_id: null,
    regenerated_from_id: null,
    superseded_at: null,
    created_at: "2026-09-16T10:00:00.000Z",
    updated_at: "2026-09-16T10:00:00.000Z",
    last_delivery: { whatsapp: null, email: null },
    ...overrides,
  };
}

const TYPES = [
  {
    code: "contract",
    label: "Contrato",
    issuable: true,
    issue_subject: "order",
    issue_policy: "once",
    regenerable: true,
  },
  {
    code: "receipt",
    label: "Recibo",
    issuable: true,
    issue_subject: "payment",
    issue_policy: "once",
    regenerable: false,
  },
  {
    code: "cuenta_cobro",
    label: "Cuenta de cobro",
    issuable: true,
    issue_subject: "order",
    issue_policy: "many",
    regenerable: true,
  },
];

const subject = { kind: "order", id: "o1" } as const;

describe("DocumentsList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDocumentTypesCache();
    featureOn = true;
    featuresLoaded = true;
    mockHasPermission.mockImplementation(() => true);
    mockTypes.mockResolvedValue({ types: TYPES });
    mockList.mockResolvedValue({ data: [], meta: {} });
  });

  it("sin la función no pinta nada ni pide nada; mientras no se sabe, tampoco", () => {
    featureOn = false;
    const { container, rerender } = render(<DocumentsList subject={subject} />);
    expect(container).toBeEmptyDOMElement();
    featureOn = true;
    featuresLoaded = false;
    rerender(<DocumentsList subject={subject} />);
    expect(container).toBeEmptyDOMElement();
    expect(mockList).not.toHaveBeenCalled();
  });

  it("un 403 (sin permiso de lectura) es silencio: la sección desaparece", async () => {
    const { HttpError } = await import("@/core/api/problem");
    mockList.mockRejectedValue(
      new HttpError({ status: 403, code: "auth/forbidden", message: "no" }),
    );
    const { container } = render(<DocumentsList subject={subject} />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("vacío: una invitación que dice qué emitir y qué llega solo; «Emitir» solo con permiso", async () => {
    render(
      <DocumentsList subject={subject} subjectLabel="la reserva JX-0042" />,
    );
    expect(
      await screen.findByText(/Todavía no hay papeles de esta reserva/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/puede salir solo con cada pago verificado/),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /Emitir/ }),
    ).toBeInTheDocument();
  });

  it("sin documents:manage: ve y abre, pero no hay Emitir ni «…»; el pie lo explica", async () => {
    mockHasPermission.mockImplementation((code) => code !== "documents:manage");
    mockList.mockResolvedValue({ data: [doc()], meta: {} });
    render(<DocumentsList subject={subject} />);
    expect(await screen.findByText("CTR-2026-0120")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Emitir/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Más acciones/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver" })).toBeInTheDocument();
    expect(screen.getByText(/gasta un consecutivo/)).toBeInTheDocument();
    expect(mockTypes).not.toHaveBeenCalled();
  });

  // ───────────────────────── F9: la entrega ─────────────────────────

  const sentWa = {
    id: "dl1",
    channel: "whatsapp" as const,
    status: "sent" as const,
    skip_reason: null,
    error_code: null,
    content_kind: "document",
    channel_kind: "whatsapp_cloud",
    recipient_masked: "+57 ··· 0199",
    attempt: 1,
    requested_by: "user" as const,
    requested_by_user_id: "u1",
    queued_at: "2026-09-17T15:20:00.000Z",
    resolved_at: "2026-09-17T15:24:00.000Z",
    created_at: "2026-09-17T15:20:00.000Z",
  };
  const OPTIONS = {
    contact: { id: "c1", display_name: "Laura Gómez" },
    whatsapp: {
      reachable: true,
      reason: null,
      window_open: true,
      last_inbound_at: "2026-09-17T15:00:00.000Z",
      window_hours: 24,
      fallback: "none",
      hsm_name: null,
      recipient_masked: "+57 ··· 0199",
    },
    email: { address_masked: "la···@example.com" },
  };

  it("F9 «Enviar» va primero en «…» y SOLO con PDF listo: generando, fallido y reemplazado no lo ofrecen", async () => {
    mockList.mockResolvedValue({
      data: [
        doc(),
        doc({
          id: "bad",
          number: "CC-2",
          status: "failed",
          type_code: "cuenta_cobro",
        }),
        doc({ id: "gone", number: "CTR-0", status: "superseded" }),
      ],
      meta: {},
    });
    render(<DocumentsList subject={subject} />);
    await screen.findByText("CTR-2026-0120");
    // La reemplazada no tiene «…»; la fallida lo tiene (Regenerar, de F8) pero SIN Enviar
    const more = screen.getAllByRole("button", { name: /Más acciones/ });
    expect(more.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Más acciones · CTR-2026-0120",
      "Más acciones · CC-2",
    ]);
    fireEvent.click(more[1]);
    expect(
      screen.getAllByRole("menuitem").map((item) => item.textContent),
    ).toEqual([
      expect.stringContaining("Regenerar"),
      expect.stringContaining("Copiar número"),
    ]);
    fireEvent.keyDown(document.body, { key: "Escape" });
    fireEvent.click(more[0]);
    const items = await screen.findAllByRole("menuitem");
    expect(items[0]).toHaveTextContent("Enviar");
    expect(items[1]).toHaveTextContent(
      "Datos y plantilla de hoy, número nuevo",
    );
    expect(items[1]).not.toHaveTextContent("Mismos datos");
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining("Enviar"),
      expect.stringContaining("Regenerar"),
      expect.stringContaining("Copiar número"),
    ]);
  });

  it("F9 enviar: el diálogo lee send-options, el 202 pone la fila en «Enviando…» sin releer, y el aviso lo dice", async () => {
    mockList.mockResolvedValue({ data: [doc()], meta: {} });
    mockSendOptions.mockResolvedValue(OPTIONS);
    mockSend.mockResolvedValue({
      delivery: { ...sentWa, status: "queued", resolved_at: null },
      document: doc({
        last_delivery: {
          whatsapp: { ...sentWa, status: "queued", resolved_at: null },
          email: null,
        },
      }),
    });
    render(
      <DocumentsList subject={subject} subjectLabel="la reserva JX-0042" />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /Más acciones/ }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: /Enviar/ }));
    expect(
      await screen.findByRole("heading", { name: /Enviar contrato/ }),
    ).toBeInTheDocument();
    expect(mockSendOptions).toHaveBeenCalledWith("d1");
    expect(await screen.findByText("Laura Gómez")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "WhatsApp" })).toBeChecked();
    fireEvent.click(
      screen.getByRole("button", { name: /Enviar por WhatsApp/ }),
    );
    await waitFor(() =>
      expect(mockSend).toHaveBeenCalledWith("d1", { channel: "whatsapp" }),
    );
    expect(
      await screen.findByText("Enviando por WhatsApp…"),
    ).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(showAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: "success",
        title: "Contrato en camino",
        description: "CTR-2026-0120 por WhatsApp. Te avisamos aquí si no sale.",
      }),
    );
    expectAlertContract(showAlert.mock.calls[0]?.[0]);
  });

  it("F9 líneas de entrega: enviado con hora, salió el aviso, no salió con razón, no se pudo con Reintentar que preselecciona el canal", async () => {
    mockList.mockResolvedValue({
      data: [
        doc({
          last_delivery: {
            whatsapp: sentWa,
            email: {
              ...sentWa,
              id: "dl2",
              channel: "email",
              status: "skipped",
              skip_reason: "contact_without_email",
            },
          },
        }),
        doc({
          id: "r",
          number: "REC-2026-0113",
          type_code: "receipt",
          type_label: "Recibo",
          last_delivery: {
            whatsapp: { ...sentWa, id: "dl3", content_kind: "hsm_notice" },
            email: null,
          },
        }),
        doc({
          id: "cc",
          number: "CC-2026-0002",
          type_code: "cuenta_cobro",
          type_label: "Cuenta de cobro",
          last_delivery: {
            whatsapp: {
              ...sentWa,
              id: "dl4",
              status: "failed",
              error_code: "provider_failed",
            },
            email: null,
          },
        }),
        doc({
          id: "edc",
          number: "EDC-2026-0003",
          type_code: "statement",
          type_label: "Estado de cuenta",
          last_delivery: {
            whatsapp: {
              ...sentWa,
              id: "dl5",
              status: "skipped",
              skip_reason: "outside_service_window_no_hsm",
            },
            email: null,
          },
        }),
      ],
      meta: {},
    });
    mockSendOptions.mockResolvedValue(OPTIONS);
    render(<DocumentsList subject={subject} />);
    expect(await screen.findByText("Enviado por WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("No salió por correo")).toBeInTheDocument();
    expect(screen.getByText(/no tiene correo en su ficha/)).toBeInTheDocument();
    expect(screen.getByText("Salió el aviso por WhatsApp")).toBeInTheDocument();
    expect(
      screen.getByText(/el PDF llega cuando responda/),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No se pudo enviar por WhatsApp"),
    ).toBeInTheDocument();
    expect(screen.getByText(/WhatsApp lo rechazó/)).toBeInTheDocument();
    // La ventana cerrada sin plantilla ofrece el correo como salida
    fireEvent.click(screen.getByRole("button", { name: /Enviar por correo/ }));
    expect(
      await screen.findByRole("heading", { name: /Enviar estado de cuenta/ }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: "Correo" })).toBeChecked(),
    );
    expect(mockSendOptions).toHaveBeenCalledWith("edc");
  });

  it("F9 sin documents:manage: las líneas existen igual, pero sin Reintentar ni Enviar; el pie lo explica", async () => {
    mockHasPermission.mockImplementation((code) => code !== "documents:manage");
    mockList.mockResolvedValue({
      data: [
        doc({
          last_delivery: {
            whatsapp: {
              ...sentWa,
              status: "failed",
              error_code: "provider_failed",
            },
            email: null,
          },
        }),
      ],
      meta: {},
    });
    render(<DocumentsList subject={subject} />);
    expect(
      await screen.findByText("No se pudo enviar por WhatsApp"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Reintentar/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /Enviar/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/le escribe al cliente/)).toBeInTheDocument();
  });

  it("F9 un reemplazado que SÍ se envió sigue diciéndolo, sin ofrecer reenviarlo", async () => {
    mockList.mockResolvedValue({
      data: [
        doc({
          status: "superseded",
          last_delivery: {
            whatsapp: {
              ...sentWa,
              status: "failed",
              error_code: "provider_failed",
            },
            email: null,
          },
        }),
      ],
      meta: {},
    });
    render(<DocumentsList subject={subject} />);
    expect(
      await screen.findByText("No se pudo enviar por WhatsApp"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Reintentar/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/lo enviado, enviado está/)).toBeInTheDocument();
  });

  it("«Ver» pide una URL firmada FRESCA al clic y la abre con noopener; nunca guarda la URL", async () => {
    mockList.mockResolvedValue({ data: [doc()], meta: {} });
    mockFileUrl.mockResolvedValue({
      url: "https://s3/firmada",
      expires_in_seconds: 300,
    });
    const open = jest.fn();
    window.open = open;
    render(<DocumentsList subject={subject} />);
    fireEvent.click(await screen.findByRole("button", { name: "Ver" }));
    await waitFor(() =>
      expect(open).toHaveBeenCalledWith(
        "https://s3/firmada",
        "_blank",
        "noopener",
      ),
    );
    expect(mockFileUrl).toHaveBeenCalledWith("d1");
    fireEvent.click(screen.getByRole("button", { name: "Ver" }));
    await waitFor(() => expect(mockFileUrl).toHaveBeenCalledTimes(2));
  });

  it("estados: generando sin acciones y con barra; fallido con motivo y Reintentar (mismo número); desactualizado como dato", async () => {
    mockList.mockResolvedValue({
      data: [
        doc({
          id: "busy",
          type_code: "statement",
          type_label: "Estado de cuenta",
          number: "EDC-2026-0003",
          status: "rendering",
          page_count: null,
        }),
        doc({
          id: "bad",
          type_code: "cuenta_cobro",
          type_label: "Cuenta de cobro",
          number: "CC-2026-0002",
          status: "failed",
          error_code: "render_timeout",
          attempts: 1,
        }),
        doc({ id: "old", created_at: "2026-09-16T10:00:00.000Z" }),
      ],
      meta: {},
    });
    mockRetry.mockResolvedValue(
      doc({ id: "bad", status: "queued", number: "CC-2026-0002" }),
    );
    render(
      <DocumentsList
        subject={subject}
        subjectUpdatedAt="2026-09-19T08:00:00.000Z"
      />,
    );
    expect(await screen.findByText("EDC-2026-0003")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: /Generando/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/El generador no respondió a tiempo/),
    ).toBeInTheDocument();
    expect(screen.getByText("el mismo número")).toBeInTheDocument();
    expect(screen.getByText("Desactualizado")).toBeInTheDocument();
    expect(
      screen.getByText(/El pedido cambió después de este papel/),
    ).toBeInTheDocument();
    // Dueño 2026-09-24: regenerar trae los datos de hoy, no los mismos
    expect(
      screen.getByText("los datos y la plantilla de hoy"),
    ).toBeInTheDocument();
    expect(screen.queryByText("los mismos datos")).toBeNull();
    // Generando: ni Ver ni «…» — solo espera
    expect(screen.getAllByRole("button", { name: "Ver" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /Reintentar/ }));
    await waitFor(() => expect(mockRetry).toHaveBeenCalledWith("bad"));
  });

  it("tres rondas agotadas: no hay Reintentar y la frase manda a regenerar", async () => {
    mockList.mockResolvedValue({
      data: [
        doc({
          status: "failed",
          error_code: "storage_unavailable",
          attempts: 3,
        }),
      ],
      meta: {},
    });
    render(<DocumentsList subject={subject} />);
    expect(
      await screen.findByText(/No se pudo guardar el PDF/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Reintentar/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("regenerar")).toBeInTheDocument();
  });

  it("emitir: el menú ofrece solo lo del pedido, dice el contrato ya emitido, y al emitir la fila aparece", async () => {
    const issued = doc({
      id: "cc",
      type_code: "cuenta_cobro",
      type_label: "Cuenta de cobro",
      number: "CC-2026-0001",
      status: "queued",
    });
    mockList.mockResolvedValue({ data: [doc()], meta: {} });
    mockIssue.mockImplementation(() => {
      // Tras emitir, el servidor ya lista el nuevo record
      mockList.mockResolvedValue({ data: [doc(), issued], meta: {} });
      return Promise.resolve({ deduplicated: false, document: issued });
    });
    render(
      <DocumentsList subject={subject} subjectLabel="la reserva JX-0042" />,
    );
    fireEvent.click(await screen.findByRole("button", { name: /Emitir/ }));
    expect(
      screen.getByText("Emitir para la reserva JX-0042"),
    ).toBeInTheDocument();
    const items = screen.getAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining("Contrato"),
      expect.stringContaining("Cuenta de cobro"),
    ]);
    expect(items[0]).toHaveTextContent("Ya emitido");
    expect(items[0]).toHaveTextContent("CTR-2026-0120");
    // El recibo no está: se emite sobre un pago
    expect(screen.queryByText("Recibo")).not.toBeInTheDocument();

    fireEvent.click(items[1]);
    await waitFor(() =>
      expect(mockIssue).toHaveBeenCalledWith("cuenta_cobro", subject),
    );
    expect(await screen.findByText("CC-2026-0001")).toBeInTheDocument();
    expect(showAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: "success",
        title: "Cuenta de cobro en preparación",
        description: expect.stringMatching(/^CC-2026-0001: /),
      }),
    );
    expectAlertContract(showAlert.mock.calls[0]?.[0]);
  });

  it("emitir un tipo que ya existe no llama al servidor; deduplicado desde el servidor se dice como info", async () => {
    mockList.mockResolvedValue({ data: [doc()], meta: {} });
    render(<DocumentsList subject={subject} />);
    fireEvent.click(await screen.findByRole("button", { name: /Emitir/ }));
    fireEvent.click(screen.getAllByRole("menuitem")[0]);
    expect(mockIssue).not.toHaveBeenCalled();
  });

  it("por contacto: lista, pero nunca Emitir (los papeles nacen del pedido)", async () => {
    mockList.mockResolvedValue({ data: [doc()], meta: {} });
    render(<DocumentsList subject={{ kind: "contact", id: "c1" }} />);
    expect(await screen.findByText("CTR-2026-0120")).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledWith({ kind: "contact", id: "c1" });
    expect(
      screen.queryByRole("button", { name: /Emitir/ }),
    ).not.toBeInTheDocument();
  });
});
