import { fireEvent, render, screen, within } from "@testing-library/react";

const mockGet = jest.fn<Promise<unknown>, []>();
const mockSave = jest.fn<Promise<unknown>, [unknown]>();
jest.mock(
  "@/modules/collections/infrastructure/services/collections-service.adapter",
  () => ({
    getCollectionsPolicy: () => mockGet(),
    saveCollectionsPolicy: (policy: unknown) => mockSave(policy),
  }),
);

const mockShowAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: mockShowAlert }),
}));

import { RemindersTab } from "@/modules/collections/ui/components/RemindersTab";

const policy = (overrides: Record<string, unknown> = {}) => ({
  deposit_pct: 30,
  installments_strategy: "equal_monthly",
  installments_count: 3,
  final_due_days_before_service: 60,
  min_days_between_installments: 20,
  fallback_term_days: 30,
  min_plan_total_cents: 0,
  grace_days: 3,
  reminder_days_before: [7, 3, 0],
  overdue_reminder_days: [1, 3, 7],
  reminder_channels: { whatsapp: true, email: true },
  pause_on_promise: true,
  templates: {
    due_soon: {
      enabled: true,
      body: "Hola {{contact_name}}, vence el {{due_date}}.",
    },
    due_today: { enabled: true, body: "Hoy vence tu cuota." },
    overdue: { enabled: true, body: "Tienes una cuota pendiente." },
  },
  hsm_templates: {},
  // Las manda el SERVIDOR, no una constante del cliente: el fixture lo refleja
  // porque es de donde la pantalla las va a sacar de verdad.
  available_variables: [
    "contact_name",
    "order_number",
    "amount",
    "balance",
    "due_date",
    "installment_seq",
    "installments_count",
    "payment_methods",
  ],
  ...overrides,
});

describe("RemindersTab · la conversación y los interruptores (premium P5)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("la isla cuenta los mensajes de la cadencia real y apagar un texto deja su hueco", async () => {
    mockGet.mockResolvedValue(
      policy({ hsm_templates: { overdue: { name: "cobro", language: "es" } } }),
    );
    render(<RemindersTab />);
    const island = await screen.findByRole("region", {
      name: "Así le escribimos",
    });
    // [7, 3, 0] antes y [1, 3, 7] después: seis mensajes.
    expect(island).toHaveTextContent(
      "6 avisos como mucho, cada uno por WhatsApp y por correo: paran en cuanto pague o prometa.",
    );
    expect(within(island).queryByText(/no se escribe nada/)).toBeNull();

    fireEvent.click(
      screen.getByRole("switch", {
        name: "Enviar el aviso de antes de vencer",
      }),
    );
    expect(island).toHaveTextContent("4 avisos como mucho");
    expect(within(island).getAllByText(/no se escribe nada/)).toHaveLength(2);
  });

  it("«Elegir plantilla» abre el texto de la mora, donde se pone la plantilla", async () => {
    mockGet.mockResolvedValue(policy());
    render(<RemindersTab />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Elegir plantilla" }),
    );
    expect(
      screen.getByLabelText("Nombre de la plantilla aprobada de Meta"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Texto del aviso de en mora/),
    ).toBeInTheDocument();
  });

  it("la vista previa del editor marca la variable desconocida en vez de esconderla", async () => {
    mockGet.mockResolvedValue(policy());
    render(<RemindersTab />);
    fireEvent.click(
      await screen.findByLabelText("Editar el texto de antes de vencer"),
    );
    fireEvent.change(
      await screen.findByLabelText(/Texto del aviso de antes de vencer/i),
      {
        target: { value: "Hola {{contact_name}} {{descuento_secreto}}" },
      },
    );
    const island = screen.getByRole("region", { name: "Así le llega" });
    expect(within(island).getByText("{{descuento_secreto}}").tagName).toBe(
      "MARK",
    );
    expect(island).toHaveTextContent("Hola Laura Gómez");
  });

  it("M2: sin plantilla aprobada el aviso por WhatsApp puede no salir; con solo correo no se dice", async () => {
    mockGet.mockResolvedValue(
      policy({ reminder_channels: { whatsapp: true, email: false } }),
    );
    const { unmount } = render(<RemindersTab />);
    const island = await screen.findByRole("region", {
      name: "Así le escribimos",
    });
    expect(within(island).getAllByText(/por\s+WhatsApp/)).not.toHaveLength(0);
    unmount();

    mockGet.mockResolvedValue(
      policy({ reminder_channels: { whatsapp: false, email: true } }),
    );
    render(<RemindersTab />);
    const onlyEmail = await screen.findByRole("region", {
      name: "Así le escribimos",
    });
    expect(
      within(onlyEmail).queryByText(/no tiene plantilla aprobada/),
    ).toBeNull();
    expect(
      screen.queryByText(/No hay plantilla aprobada para la mora/),
    ).toBeNull();
  });
});
