import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ContactDataDTO, ContactDataField } from "@/modules/crm/domain/contact-data";
import { ContactDataPanel } from "../ContactDataPanel";

const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal: jest.fn(), closeModal: jest.fn() }),
}));

// Permiso variable por test: el gate de acciones es `contacts:manage`.
const permissions = { manage: true };
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({
    hasPermission: (code: string) =>
      code === "contacts:manage" ? permissions.manage : true,
    status: "authenticated",
  }),
}));

// Sin socket: `useSocketEvent` es un no-op y el hook solo hace el fetch.
jest.mock("@/core/realtime/use-socket", () => ({
  useSocket: () => ({ socket: null, connected: false }),
  useSocketEvent: jest.fn(),
}));

jest.mock("@/modules/crm/infrastructure/services/contacts-service.adapter", () => ({
  getContactData: jest.fn(),
  reviewContactField: jest.fn(),
}));
jest.mock("@/modules/crm/infrastructure/services/tenant-users.cache", () => ({
  getTenantUserNames: jest.fn().mockResolvedValue(new Map([["u-isabel", "Isabel"]])),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const api = require("@/modules/crm/infrastructure/services/contacts-service.adapter") as {
  getContactData: jest.Mock;
  reviewContactField: jest.Mock;
};
/* eslint-enable @typescript-eslint/no-require-imports */

function field(overrides: Partial<ContactDataField> = {}): ContactDataField {
  return {
    code: "company",
    label: "Empresa",
    defined: true,
    storage: "custom",
    type: "text",
    options: null,
    required: false,
    flow: "contact_registration",
    value: "Kodecol",
    state: "captured",
    protected: false,
    source: "ai_agent",
    captured_at: new Date().toISOString(),
    conversation_id: "conv-1",
    actor_user_id: null,
    canonical_from: null,
    raw_value: null,
    invalid_reason: null,
    attempts: 0,
    proposal: null,
    ...overrides,
  };
}

function dto(fields: ContactDataField[], overrides: Partial<ContactDataDTO> = {}): ContactDataDTO {
  return {
    contact_id: "c1",
    protected_fields: fields.filter((f) => f.protected).map((f) => f.code),
    conversation: null,
    fields,
    system: [],
    session: {},
    ...overrides,
  };
}

const FIELDS: ContactDataField[] = [
  field(),
  field({
    code: "city",
    label: "Ciudad",
    storage: "column",
    value: "Bogotá",
    state: "confirmed",
    protected: true,
    source: "user",
    actor_user_id: "u-isabel",
  }),
  field({
    code: "team_size",
    label: "Tamaño del equipo",
    value: "12",
    state: "corrected",
    protected: true,
    source: "user",
    actor_user_id: "u-isabel",
    proposal: { value: "20", captured_at: new Date().toISOString(), conversation_id: "conv-1" },
  }),
  field({
    code: "budget",
    label: "Presupuesto mensual",
    type: "number",
    flow: "order_intake",
    value: 3000000,
    source: "public_form",
  }),
  field({
    code: "decision_date",
    label: "Fecha de decisión",
    type: "date",
    flow: "order_intake",
    required: true,
    value: null,
    state: "missing",
    source: null,
    captured_at: null,
    attempts: 3,
  }),
  field({
    code: "instagram",
    label: "",
    defined: false,
    flow: null,
    value: "@lauragomez.co",
  }),
];

function row(labelText: string): HTMLElement {
  const dt = screen.getByText(labelText, { selector: "dt" });
  const container = dt.closest("[data-code]");
  if (container === null) throw new Error(`fila «${labelText}» no encontrada`);
  return container as HTMLElement;
}

beforeEach(() => {
  jest.clearAllMocks();
  permissions.manage = true;
  api.getContactData.mockResolvedValue(dto(FIELDS));
  api.reviewContactField.mockImplementation(async () => dto(FIELDS));
});
afterEach(cleanup);

describe("ContactDataPanel (card)", () => {
  it("pinta el resumen, los grupos en orden y la línea de origen de cada dato", async () => {
    render(<ContactDataPanel contactId="c1" variant="card" />);
    expect(await screen.findByText("Datos del cliente")).toBeInTheDocument();
    await screen.findByText("Kodecol");

    // 5 con valor de 6 (definidos + huérfano con valor); 2 por revisar (propuesta + obligatorio pedido 3 veces).
    expect(screen.getByText("5 de 6")).toBeInTheDocument();
    expect(screen.getByText("2 por revisar")).toBeInTheDocument();
    const headings = screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent);
    expect(headings).toEqual(["Registro", "Pedido"]);

    // Origen: Agente IA con ✦, Isabel resuelta desde la caché de usuarios, formulario web.
    expect(within(row("Empresa")).getByText("Agente IA")).toBeInTheDocument();
    expect(await within(row("Ciudad")).findByText("Isabel")).toBeInTheDocument();
    expect(within(row("Presupuesto mensual")).getByText("Formulario web")).toBeInTheDocument();
    expect(within(row("Presupuesto mensual")).getByText("3.000.000")).toBeInTheDocument();

    // Verificados con ✓; el capturado no.
    expect(within(row("Ciudad")).getByRole("img", { name: "Verificado" })).toBeInTheDocument();
    expect(within(row("Empresa")).queryByRole("img", { name: "Verificado" })).toBeNull();

    // Faltante obligatorio pedido 3 veces.
    const missing = row("Fecha de decisión");
    expect(within(missing).getByText("Sin dato")).toBeInTheDocument();
    expect(within(missing).getByText(/lo pidió 3 veces sin respuesta/)).toBeInTheDocument();

    // Huérfano: code humanizado + enlace al editor del flujo.
    const orphan = row("Instagram");
    expect(within(orphan).getByText("campo sin definir")).toBeInTheDocument();
    expect(within(orphan).getByRole("link", { name: "Añadir al formulario" })).toHaveAttribute(
      "href",
      "/settings/forms?flow=contact_registration",
    );

    // Propuesta del agente sobre un campo protegido.
    expect(within(row("Tamaño del equipo")).getByText(/el agente propone «20»/)).toBeInTheDocument();
  });

  it("las acciones existen en la fila pero solo se muestran al pasar el ratón o con foco dentro", async () => {
    render(<ContactDataPanel contactId="c1" variant="card" />);
    await screen.findByText("Kodecol");

    const actions = within(row("Empresa")).getByRole("button", { name: "Confirmar Empresa" }).parentElement;
    expect(actions).toHaveClass("opacity-0", "group-hover:opacity-100", "group-focus-within:opacity-100");
    // Un verificado no ofrece «Confirmar»; sí «Corregir» y el menú.
    expect(within(row("Ciudad")).queryByRole("button", { name: "Confirmar Ciudad" })).toBeNull();
    expect(within(row("Ciudad")).getByRole("button", { name: "Corregir Ciudad" })).toBeInTheDocument();
    expect(within(row("Ciudad")).getByRole("button", { name: "Más acciones de Ciudad" })).toBeInTheDocument();
    // Un faltante solo ofrece «Corregir».
    expect(within(row("Fecha de decisión")).queryByRole("button", { name: /Más acciones/ })).toBeNull();
    expect(within(row("Fecha de decisión")).getByRole("button", { name: "Corregir Fecha de decisión" })).toBeInTheDocument();
  });

  it("confirmar manda { action: 'confirm' } y reemplaza los datos con la respuesta", async () => {
    api.reviewContactField.mockResolvedValue(
      dto([field({ state: "confirmed", protected: true })]),
    );
    render(<ContactDataPanel contactId="c1" variant="card" />);
    await screen.findByText("Kodecol");

    fireEvent.click(within(row("Empresa")).getByRole("button", { name: "Confirmar Empresa" }));

    await waitFor(() =>
      expect(api.reviewContactField).toHaveBeenCalledWith("c1", "company", { action: "confirm" }),
    );
    expect(await within(row("Empresa")).findByRole("img", { name: "Verificado" })).toBeInTheDocument();
    // La respuesta del PATCH sustituye la proyección completa: ya no está el resto.
    expect(screen.queryByText("Ciudad", { selector: "dt" })).toBeNull();
  });

  it("corregir en línea: el control sustituye al valor, Guardar manda { value } y Esc cancela", async () => {
    render(<ContactDataPanel contactId="c1" variant="card" />);
    await screen.findByText("Kodecol");

    fireEvent.click(within(row("Empresa")).getByRole("button", { name: "Corregir Empresa" }));
    const input = within(row("Empresa")).getByRole("textbox", { name: "Empresa" });
    expect(input).toHaveValue("Kodecol");
    expect(
      within(row("Empresa")).getByText(/Al guardar queda verificado: el agente no lo cambiará/),
    ).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "Kodecol SAS" } });
    fireEvent.click(within(row("Empresa")).getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(api.reviewContactField).toHaveBeenCalledWith("c1", "company", { value: "Kodecol SAS" }),
    );
    await waitFor(() => expect(within(row("Empresa")).queryByRole("textbox")).toBeNull());

    // Esc cancela sin llamar al backend.
    api.reviewContactField.mockClear();
    fireEvent.click(within(row("Empresa")).getByRole("button", { name: "Corregir Empresa" }));
    fireEvent.keyDown(within(row("Empresa")).getByRole("textbox", { name: "Empresa" }), { key: "Escape" });
    expect(within(row("Empresa")).queryByRole("textbox")).toBeNull();
    expect(api.reviewContactField).not.toHaveBeenCalled();
  });

  it("Enter guarda el número como número", async () => {
    render(<ContactDataPanel contactId="c1" variant="card" />);
    await screen.findByText("Kodecol");
    const budget = row("Presupuesto mensual");
    fireEvent.click(within(budget).getByRole("button", { name: "Corregir Presupuesto mensual" }));
    const input = within(budget).getByRole("spinbutton", { name: "Presupuesto mensual" });
    fireEvent.change(input, { target: { value: "4500000" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() =>
      expect(api.reviewContactField).toHaveBeenCalledWith("c1", "budget", { value: 4500000 }),
    );
  });

  it("rechazar abre el diálogo de confirmación y manda { action: 'reject' }", async () => {
    render(<ContactDataPanel contactId="c1" variant="card" />);
    await screen.findByText("Kodecol");

    fireEvent.click(within(row("Empresa")).getByRole("button", { name: "Más acciones de Empresa" }));
    const menu = screen.getByRole("menu");
    // Historial deshabilitado en F1; «liberar» solo en campos protegidos (este no lo es).
    expect(within(menu).getByRole("menuitem", { name: /Ver historial/ })).toHaveAttribute("aria-disabled", "true");
    expect(within(menu).queryByRole("menuitem", { name: /Dejar que el agente lo actualice/ })).toBeNull();
    fireEvent.click(within(menu).getByRole("menuitem", { name: /Rechazar dato/ }));

    // `DialogContent` monta el contenido vía `asChild` sobre un `AnimatePresence`,
    // así que el `role="dialog"` de Radix no llega al DOM: se localiza por su título.
    const title = await screen.findByText("¿Rechazar «Kodecol»?");
    const dialog = title.closest('[data-slot="dialog-content"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(
      within(dialog).getByText("Se borra de la ficha y el agente podrá volver a pedirlo."),
    ).toBeInTheDocument();
    expect(api.reviewContactField).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Rechazar" }));
    await waitFor(() =>
      expect(api.reviewContactField).toHaveBeenCalledWith("c1", "company", { action: "reject" }),
    );
  });

  it("un campo protegido ofrece «Dejar que el agente lo actualice» → { action: 'release' }", async () => {
    render(<ContactDataPanel contactId="c1" variant="card" />);
    await screen.findByText("Kodecol");
    fireEvent.click(within(row("Ciudad")).getByRole("button", { name: "Más acciones de Ciudad" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Dejar que el agente lo actualice/ }));
    await waitFor(() =>
      expect(api.reviewContactField).toHaveBeenCalledWith("c1", "city", { action: "release" }),
    );
  });

  it("«Usar» la propuesta manda { value } con el valor propuesto; «Ignorar» solo la oculta", async () => {
    render(<ContactDataPanel contactId="c1" variant="card" />);
    await screen.findByText("Kodecol");
    const team = row("Tamaño del equipo");

    fireEvent.click(within(team).getByRole("button", { name: "Ignorar" }));
    expect(within(team).queryByText(/el agente propone/)).toBeNull();
    expect(api.reviewContactField).not.toHaveBeenCalled();
  });

  it("«Usar» la propuesta manda el valor propuesto", async () => {
    render(<ContactDataPanel contactId="c1" variant="card" />);
    await screen.findByText("Kodecol");
    fireEvent.click(within(row("Tamaño del equipo")).getByRole("button", { name: "Usar" }));
    await waitFor(() =>
      expect(api.reviewContactField).toHaveBeenCalledWith("c1", "team_size", { value: "20" }),
    );
  });

  it("si el PATCH falla, avisa con el mensaje de error y la fila sigue igual", async () => {
    api.reviewContactField.mockRejectedValue(new Error("boom"));
    render(<ContactDataPanel contactId="c1" variant="card" />);
    await screen.findByText("Kodecol");
    fireEvent.click(within(row("Empresa")).getByRole("button", { name: "Confirmar Empresa" }));
    await waitFor(() => expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" })));
    expect(screen.getByText("Kodecol")).toBeInTheDocument();
  });

  it("sin contacts:manage no hay ninguna acción, ni «Usar»/«Ignorar»", async () => {
    permissions.manage = false;
    render(<ContactDataPanel contactId="c1" variant="card" />);
    await screen.findByText("Kodecol");
    expect(screen.queryByRole("button", { name: /Confirmar|Corregir|Más acciones|Usar|Ignorar/ })).toBeNull();
    // El dato sigue visible en solo lectura, propuesta incluida.
    expect(screen.getByText(/el agente propone «20»/)).toBeInTheDocument();
  });

  it("sin campos definidos ni valores: estado vacío con el botón hacia los formularios", async () => {
    api.getContactData.mockResolvedValue(dto([]));
    render(<ContactDataPanel contactId="c1" variant="card" />);
    expect(await screen.findByText(/Tu agente aún no pide datos a los clientes/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Configurar formularios de captura" })).toHaveAttribute(
      "href",
      "/settings/forms",
    );
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("el pie despliega las claves técnicas", async () => {
    api.getContactData.mockResolvedValue(
      dto(FIELDS, { system: [{ code: "_last_intent", value: "quote" }, { code: "_source_ref", value: null }] }),
    );
    render(<ContactDataPanel contactId="c1" variant="card" />);
    await screen.findByText("Kodecol");
    expect(screen.getByText(/Lo que verificas queda protegido/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "2 claves técnicas" }));
    expect(screen.getByText("_last_intent")).toBeInTheDocument();
    expect(screen.getByText("quote")).toBeInTheDocument();
  });

  it("si la carga falla ofrece reintentar", async () => {
    api.getContactData.mockRejectedValueOnce(new Error("500")).mockResolvedValueOnce(dto(FIELDS));
    render(<ContactDataPanel contactId="c1" variant="card" />);
    const retry = await screen.findByRole("button", { name: "Reintentar" });
    await act(async () => {
      fireEvent.click(retry);
    });
    expect(await screen.findByText("Kodecol")).toBeInTheDocument();
    expect(api.getContactData).toHaveBeenCalledTimes(2);
  });
});

describe("ContactDataPanel (rail)", () => {
  it("pasa conversation_id, no pinta cabecera ni menú ⋯ y muestra el borrador, el último pedido y la cita", async () => {
    api.getContactData.mockResolvedValue(
      dto(FIELDS, {
        session: {
          order_draft: { draft_id: "d-1", items_count: 2, total_cents: 18000000 },
          last_order: { order_id: "o-1", order_number: 42, status: "paid" },
          last_appointment: {
            appointment_id: "a-1",
            starts_at: "2026-09-18T15:00:00.000Z",
            product_id: null,
          },
        },
      }),
    );
    render(<ContactDataPanel contactId="c1" conversationId="conv-1" variant="rail" />);
    await screen.findByText("Kodecol");

    expect(api.getContactData).toHaveBeenCalledWith("c1", "conv-1");
    expect(screen.queryByText("Datos del cliente", { selector: "h3" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Más acciones/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Confirmar Empresa" })).toBeInTheDocument();

    expect(screen.getByRole("heading", { level: 4, name: "En esta conversación" })).toBeInTheDocument();
    // El carrito de la conversación no es un pedido: fila informativa, sin enlace.
    expect(screen.getByText("Pedido en borrador")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Pedido en borrador/ })).toBeNull();
    expect(screen.getByText(/2 productos · \$\s?180\.000/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Último pedido.*#42/ })).toHaveAttribute("href", "/orders/o-1");
    expect(screen.getByRole("link", { name: /^Cita/ })).toHaveAttribute(
      "href",
      "/scheduling/calendar/appointment/a-1",
    );
  });
});
