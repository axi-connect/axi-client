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
jest.mock(
  "@/modules/documents/infrastructure/services/documents-service.adapter",
  () => ({
    listDocuments: (subject: unknown) => mockList(subject),
    getDocumentFileUrl: (id: string) => mockFileUrl(id),
    issueDocument: (...args: unknown[]) => mockIssue(...args),
    regenerateDocument: (id: string) => mockRegenerate(id),
    retryDocument: (id: string) => mockRetry(id),
    listDocumentTypes: () => mockTypes(),
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

import { DocumentsList } from "@/modules/documents/ui/components/list/DocumentsList";
import { resetDocumentTypesCache } from "@/modules/documents/infrastructure/hooks/use-document-types";

function doc(overrides: Partial<DocumentDTO> = {}): DocumentDTO {
  return {
    id: "d1",
    type_code: "contract",
    type_label: "Contrato",
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
      screen.getByText(/llegará solo con cada pago verificado/),
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
      expect.objectContaining({ tone: "success" }),
    );
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
