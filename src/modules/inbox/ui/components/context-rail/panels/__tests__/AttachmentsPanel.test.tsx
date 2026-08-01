import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ConversationDTO, UiMessage } from "@/modules/inbox/domain/inbox";
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store";
import { AttachmentsPanel } from "../AttachmentsPanel";

// El panel no pide adjuntos al backend, pero los thumbnails sí firman URLs.
jest.mock("@/modules/inbox/infrastructure/services/inbox-service.adapter", () => ({
  getAttachmentUrl: jest.fn().mockResolvedValue({ url: "https://x/a.jpg", expires_in_seconds: 300 }),
}));

const CONVERSATION_ID = "conv-1";

const conversation = {
  id: CONVERSATION_ID,
  contact: { id: "c1", full_name: "Cristian", phone: null, avatar_url: null },
} as ConversationDTO;

function message(overrides: Partial<UiMessage> & { id: string }): UiMessage {
  return {
    direction: "inbound",
    sender_type: "contact",
    sender_user_id: null,
    content_type: "text",
    body: null,
    payload: null,
    provider_message_id: null,
    status: "received",
    status_updated_at: null,
    error: null,
    attachments: [],
    created_at: new Date().toISOString(),
    ...overrides,
  } as UiMessage;
}

function attachment(id: string, filename: string, mime: string) {
  return { id, filename, mime_type: mime, size_bytes: 2048 };
}

/** Carga el hilo en el store real: el panel es un selector derivado de él. */
function seedThread(items: UiMessage[], nextCursor?: string) {
  useInboxStore.setState({
    messagesById: { [CONVERSATION_ID]: { items, next_cursor: nextCursor, loaded: true } },
  });
}

function renderPanel() {
  return render(
    <AttachmentsPanel conversation={conversation} contactId="c1" contextVersion={0} />,
  );
}

afterEach(() => {
  useInboxStore.setState({ messagesById: {} });
});

describe("AttachmentsPanel", () => {
  it("deriva los adjuntos del hilo e ignora el texto", () => {
    seedThread([
      message({ id: "m1", body: "hola" }),
      message({
        id: "m2",
        content_type: "document",
        attachments: [attachment("a2", "cotizacion.pdf", "application/pdf")],
      }),
    ]);
    renderPanel();

    expect(screen.getByText("cotizacion.pdf")).toBeInTheDocument();
    expect(screen.queryByText("hola")).not.toBeInTheDocument();
  });

  it("excluye ubicaciones: no hay archivo que listar", () => {
    seedThread([message({ id: "m1", content_type: "location" })]);
    renderPanel();

    expect(screen.getByText("Todavía no se han compartido archivos.")).toBeInTheDocument();
  });

  it("etiqueta las notas de voz por lo que son, no por el nombre del archivo", () => {
    seedThread([
      message({
        id: "m1",
        content_type: "audio",
        attachments: [attachment("a1", "audio-0001.ogg", "audio/ogg")],
      }),
    ]);
    renderPanel();

    expect(screen.getByText("Nota de voz")).toBeInTheDocument();
    expect(screen.queryByText("audio-0001.ogg")).not.toBeInTheDocument();
  });

  it("agrupa por día con Hoy y Ayer", () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    seedThread([
      message({
        id: "m1",
        created_at: yesterday,
        content_type: "document",
        attachments: [attachment("a1", "viejo.pdf", "application/pdf")],
      }),
      message({
        id: "m2",
        content_type: "document",
        attachments: [attachment("a2", "nuevo.pdf", "application/pdf")],
      }),
    ]);
    renderPanel();

    expect(screen.getByText("Hoy")).toBeInTheDocument();
    expect(screen.getByText("Ayer")).toBeInTheDocument();
    // Más reciente primero: el grupo Hoy precede a Ayer en el DOM.
    const headings = screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent);
    expect(headings).toEqual(["Hoy", "Ayer"]);
  });

  it("filtra por categoría", () => {
    seedThread([
      message({
        id: "m1",
        content_type: "document",
        attachments: [attachment("a1", "doc.pdf", "application/pdf")],
      }),
      message({
        id: "m2",
        content_type: "audio",
        attachments: [attachment("a2", "voz.ogg", "audio/ogg")],
      }),
    ]);
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Documentos" }));
    expect(screen.getByText("doc.pdf")).toBeInTheDocument();
    expect(screen.queryByText("Nota de voz")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Audio" }));
    expect(screen.getByText("Nota de voz")).toBeInTheDocument();
    expect(screen.queryByText("doc.pdf")).not.toBeInTheDocument();
  });

  it("el vacío por filtro explica que es del filtro, no del hilo", () => {
    seedThread([
      message({
        id: "m1",
        content_type: "document",
        attachments: [attachment("a1", "doc.pdf", "application/pdf")],
      }),
    ]);
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Audio" }));
    expect(screen.getByText(/Sin adjuntos de tipo/)).toBeInTheDocument();
  });

  it("avisa del tramo parcial y pagina reusando el cursor del chat", async () => {
    const fetchOlderMessages = jest.fn().mockResolvedValue(undefined);
    seedThread(
      [
        message({
          id: "m1",
          content_type: "document",
          attachments: [attachment("a1", "doc.pdf", "application/pdf")],
        }),
      ],
      "cursor-abc",
    );
    useInboxStore.setState({ fetchOlderMessages });
    renderPanel();

    expect(
      screen.getByText("Mostrando los adjuntos del tramo cargado del hilo."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cargar más" }));
    expect(fetchOlderMessages).toHaveBeenCalledWith(CONVERSATION_ID);
    // El botón se rehabilita al resolver: evita el warning de act() por el
    // setState que ocurre fuera del tick del click.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Cargar más" })).not.toBeDisabled(),
    );
  });

  it("sin más páginas no aparece el aviso de tramo parcial", () => {
    seedThread([
      message({
        id: "m1",
        content_type: "document",
        attachments: [attachment("a1", "doc.pdf", "application/pdf")],
      }),
    ]);
    renderPanel();

    expect(screen.queryByText(/tramo cargado/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cargar más" })).not.toBeInTheDocument();
  });
});
