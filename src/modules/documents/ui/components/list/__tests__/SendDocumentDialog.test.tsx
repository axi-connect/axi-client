import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { HttpError } from "@/core/api/problem";
import type { DocumentSendOptionsDTO } from "@/modules/documents/domain/delivery";
import type { DocumentDTO } from "@/modules/documents/domain/document";

const mockSendOptions = jest.fn<Promise<DocumentSendOptionsDTO>, [string]>();
const mockSend = jest.fn();
jest.mock(
  "@/modules/documents/infrastructure/services/documents-service.adapter",
  () => ({
    getDocumentSendOptions: (id: string) => mockSendOptions(id),
    sendDocument: (...args: unknown[]) => mockSend(...args),
  }),
);
const mockHasPermission = jest.fn<boolean, [string]>(() => true);
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: mockHasPermission }),
}));
const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert }),
}));

import { SendDocumentDialog } from "@/modules/documents/ui/components/list/SendDocumentDialog";

const NOW = new Date("2026-09-17T18:00:00.000Z");

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
    last_delivery: { whatsapp: null, email: null },
    ...overrides,
  };
}

function options(
  overrides: {
    whatsapp?: Partial<DocumentSendOptionsDTO["whatsapp"]>;
    email?: Partial<DocumentSendOptionsDTO["email"]>;
    contact?: DocumentSendOptionsDTO["contact"];
  } = {},
): DocumentSendOptionsDTO {
  return {
    contact:
      overrides.contact === undefined
        ? { id: "c1", display_name: "Laura Gómez" }
        : overrides.contact,
    whatsapp: {
      reachable: true,
      reason: null,
      window_open: true,
      last_inbound_at: "2026-09-17T15:00:00.000Z",
      window_hours: 24,
      fallback: "none",
      hsm_name: null,
      recipient_masked: "+57 ··· 0199",
      ...overrides.whatsapp,
    },
    email: { address_masked: "la···@example.com", ...overrides.email },
  };
}

const CLOSED_NO_HSM = {
  window_open: false,
  reason: "outside_service_window",
  fallback: "none" as const,
};

function open(
  props: Partial<React.ComponentProps<typeof SendDocumentDialog>> = {},
) {
  const onOpenChange = jest.fn();
  const onSent = jest.fn();
  const onInFlight = jest.fn();
  render(
    <SendDocumentDialog
      intent={{ document: doc() }}
      subjectLabel="la reserva JX-0042"
      onOpenChange={onOpenChange}
      onSent={onSent}
      onInFlight={onInFlight}
      {...props}
    />,
  );
  return { onOpenChange, onSent, onInFlight };
}

describe("SendDocumentDialog: dice lo mismo que hará el motor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ now: NOW, advanceTimers: true });
    mockHasPermission.mockImplementation(() => true);
  });
  afterEach(() => jest.useRealTimers());

  it("1 · ventana abierta: WhatsApp marcado con «escribió hace 3 h», correo enmascarado, el aviso promete el PDF al chat y el botón nombra el canal", async () => {
    mockSendOptions.mockResolvedValue(options());
    open();
    // El Dialog de la casa anima el contenido con motion: el rol no llega al
    // DOM, así que el diálogo se reconoce por su título.
    expect(
      await screen.findByRole("heading", { name: /Enviar contrato/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("CTR-2026-0120")).toBeInTheDocument();
    expect(screen.getByText(/de la reserva JX-0042/)).toBeInTheDocument();
    const wa = await screen.findByRole("radio", { name: "WhatsApp" });
    expect(wa).toBeChecked();
    expect(wa).toHaveTextContent(/\+57 ··· 0199 · escribió hace 3 h/);
    expect(screen.getByRole("radio", { name: "Correo" })).toHaveTextContent(
      "la···@example.com",
    );
    expect(screen.getByText(/el PDF le llega al chat/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Enviar por WhatsApp/ }),
    ).toBeEnabled();
  });

  it("2 · sin correo en la ficha: la tarjeta se deshabilita CON la razón y no hay campo para inventarse uno", async () => {
    mockSendOptions.mockResolvedValue(
      options({ email: { address_masked: null } }),
    );
    open();
    const mail = await screen.findByRole("radio", { name: "Correo" });
    expect(mail).toBeDisabled();
    expect(mail).toHaveTextContent(/Añádelo en el contacto/);
    expect(screen.queryByText(/Usar otro correo/)).not.toBeInTheDocument();
  });

  it("3 · fuera de 24 h con plantilla: WhatsApp sigue disponible y el aviso dice que sale la plantilla y el PDF al responder", async () => {
    mockSendOptions.mockResolvedValue(
      options({
        whatsapp: {
          window_open: false,
          reason: "outside_service_window",
          fallback: "hsm",
          hsm_name: "documento_listo",
          last_inbound_at: "2026-09-15T15:00:00.000Z",
        },
      }),
    );
    open();
    const wa = await screen.findByRole("radio", { name: "WhatsApp" });
    expect(wa).toBeChecked();
    expect(wa).toBeEnabled();
    expect(screen.getByText(/«documento_listo»/)).toBeInTheDocument();
    expect(
      screen.getByText(/el PDF sale solo cuando responda/),
    ).toBeInTheDocument();
  });

  it("4 · fuera de 24 h sin plantilla: WhatsApp deshabilitado con la razón, el correo queda marcado, y «Configurar plantilla» solo con permiso de plantillas", async () => {
    mockSendOptions.mockResolvedValue(options({ whatsapp: CLOSED_NO_HSM }));
    open({ intent: { document: doc(), channel: "whatsapp" } });
    const wa = await screen.findByRole("radio", { name: "WhatsApp" });
    expect(wa).toBeDisabled();
    expect(wa).toHaveTextContent(/no hay una plantilla aprobada/);
    // El canal pedido no se puede: cae al correo, y el botón cambia de nombre
    expect(screen.getByRole("radio", { name: "Correo" })).toBeChecked();
    expect(
      screen.getByRole("button", { name: /Enviar por correo/ }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("link", { name: /Configurar plantilla/ }),
    ).not.toBeInTheDocument();
  });

  it("4b · sin ningún canal, el aviso de la plantilla se ve con su enlace (quien puede configurar) y no hay nada que enviar", async () => {
    mockSendOptions.mockResolvedValue(
      options({ whatsapp: CLOSED_NO_HSM, email: { address_masked: null } }),
    );
    open();
    await screen.findByRole("radio", { name: "WhatsApp" });
    expect(
      screen.getByRole("link", { name: /Configurar plantilla/ }),
    ).toHaveAttribute("href", "/settings/company/documentos");
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
  });

  it("5 · otro correo solo esta vez: viaja como to_email y la ficha no cambia; un correo inválido no sale; la tarjeta recuerda que ya se envió", async () => {
    mockSendOptions.mockResolvedValue(options());
    mockSend.mockResolvedValue({ delivery: {}, document: doc() });
    const sentBefore = {
      id: "dl0",
      channel: "email" as const,
      status: "sent" as const,
      skip_reason: null,
      error_code: null,
      content_kind: "document",
      channel_kind: null,
      recipient_masked: "la***@example.com",
      attempt: 1,
      requested_by: "user" as const,
      requested_by_user_id: null,
      queued_at: "2026-09-12T10:00:00.000Z",
      resolved_at: "2026-09-12T10:00:05.000Z",
      created_at: "2026-09-12T10:00:00.000Z",
    };
    const { onSent, onOpenChange } = open({
      intent: {
        document: doc({ last_delivery: { whatsapp: null, email: sentBefore } }),
        channel: "email",
      },
    });
    const mail = await screen.findByRole("radio", { name: "Correo" });
    expect(mail).toBeChecked();
    expect(mail).toHaveTextContent(/Ya se envió por correo el 12 de sept/);
    fireEvent.click(screen.getByRole("button", { name: /Usar otro correo/ }));
    const input = screen.getByRole("textbox", {
      name: /Otro correo para este envío/,
    });
    expect(
      screen.getByText(/La ficha del contacto no cambia/),
    ).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "contabilidad" } });
    fireEvent.click(screen.getByRole("button", { name: /Enviar por correo/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/correo válido/);
    expect(mockSend).not.toHaveBeenCalled();
    fireEvent.change(input, {
      target: { value: "contabilidad@cocuytravel.co" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Enviar por correo/ }));
    await waitFor(() =>
      expect(mockSend).toHaveBeenCalledWith("d1", {
        channel: "email",
        to_email: "contabilidad@cocuytravel.co",
      }),
    );
    expect(onSent).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(showAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: "success",
        title: "Contrato CTR-2026-0120 en camino por correo",
      }),
    );
  });

  it("6 · el 422 «sin correo» queda inline y el diálogo abierto; el 409 «ya va en camino» avisa como info, cierra y pide releer", async () => {
    mockSendOptions.mockResolvedValue(options());
    mockSend.mockRejectedValueOnce(
      new HttpError({
        status: 422,
        code: "documents/contact_without_email",
        message: "sin correo",
      }),
    );
    const { onOpenChange, onInFlight } = open({
      intent: { document: doc(), channel: "email" },
    });
    await screen.findByRole("radio", { name: "Correo" });
    fireEvent.click(screen.getByRole("button", { name: /Enviar por correo/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no tiene correo en su ficha/,
    );
    expect(onOpenChange).not.toHaveBeenCalled();

    mockSend.mockRejectedValueOnce(
      new HttpError({
        status: 409,
        code: "documents/delivery_in_flight",
        message: "en camino",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Enviar por correo/ }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(onInFlight).toHaveBeenCalled();
    expect(showAlert).toHaveBeenCalledWith(
      expect.objectContaining({ tone: "info", title: "Ya va en camino" }),
    );
  });

  it("7 · si el preflight falla, las dos tarjetas quedan activas sin aviso: el servidor revalida al enviar", async () => {
    mockSendOptions.mockRejectedValue(new Error("red caída"));
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    open();
    const wa = await screen.findByRole("radio", { name: "WhatsApp" });
    expect(wa).toBeEnabled();
    expect(wa).toBeChecked();
    expect(screen.getByRole("radio", { name: "Correo" })).toBeEnabled();
    expect(wa).toHaveTextContent(/El servidor lo revisa al enviar/);
    expect(
      screen.queryByText(/el PDF le llega al chat/),
    ).not.toBeInTheDocument();
  });

  it("8 · la ventana NO se recalcula aquí: con window_open=true y un último mensaje viejo, sigue siendo «al chat»", async () => {
    mockSendOptions.mockResolvedValue(
      options({
        whatsapp: {
          window_open: true,
          last_inbound_at: "2026-08-01T00:00:00.000Z",
        },
      }),
    );
    open();
    await screen.findByRole("radio", { name: "WhatsApp" });
    expect(screen.getByText(/el PDF le llega al chat/)).toBeInTheDocument();
    expect(screen.queryByText(/plantilla/)).not.toBeInTheDocument();
  });

  it("9 · cerrado (`intent` null) no pinta nada ni pide el preflight", () => {
    open({ intent: null });
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(mockSendOptions).not.toHaveBeenCalled();
  });
});
