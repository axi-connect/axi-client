import { fireEvent, render, screen, waitFor } from "@testing-library/react";

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

/**
 * La pestaña de recordatorios (F5 Cobros).
 *
 * Lo que se prueba aquí no es que los campos pinten: es que la pantalla enseñe
 * las CONSECUENCIAS que una rejilla de ajustes esconde — el hueco que deja una
 * plantilla apagada, y que sin plantilla aprobada de Meta el aviso de mora no
 * sale nunca.
 */
describe("RemindersTab", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSave.mockReset();
    mockShowAlert.mockReset();
  });

  it("QA F5: una variable inventada en cualquier aviso bloquea «Guardar recordatorios» y lo dice; sin ella, guarda", async () => {
    mockGet.mockResolvedValue(
      policy({
        templates: {
          due_soon: {
            enabled: true,
            body: "Hola {{cliente.mascota}}, vence pronto.",
          },
          due_today: { enabled: true, body: "Hoy vence tu cuota." },
          overdue: { enabled: true, body: "Tienes una cuota pendiente." },
        },
      }),
    );
    const { unmount } = render(<RemindersTab />);
    const save = await screen.findByRole("button", {
      name: "Guardar recordatorios",
    });
    expect(save).toBeDisabled();
    expect(screen.getByText(/No se puede guardar/)).toHaveTextContent(
      /antes de vencer/i,
    );
    unmount();

    mockGet.mockResolvedValue(policy());
    render(<RemindersTab />);
    expect(
      await screen.findByRole("button", { name: "Guardar recordatorios" }),
    ).toBeEnabled();
    expect(screen.queryByText(/No se puede guardar/)).toBeNull();
  });

  it("avisa de que sin plantilla aprobada la mora no se persigue", async () => {
    mockGet.mockResolvedValue(policy());
    render(<RemindersTab />);

    const notice = await screen.findByText(
      /No hay plantilla aprobada para la mora/i,
    );
    // §9.4: un estado que dura es `Alert` en línea, no una caja teñida a mano
    expect(
      notice.closest('[role="alert"], [data-slot="alert"]'),
    ).not.toBeNull();
  });

  it("con la plantilla aprobada registrada, el aviso desaparece", async () => {
    mockGet.mockResolvedValue(
      policy({
        hsm_templates: {
          overdue: { name: "cobro_recordatorio", language: "es" },
        },
      }),
    );
    render(<RemindersTab />);

    await screen.findByText("Cuándo escribimos");
    expect(
      screen.queryByText(/No hay plantilla aprobada/i),
    ).not.toBeInTheDocument();
  });

  it("una plantilla apagada deja un HUECO visible en el hilo", async () => {
    // Es el punto entero de la vista previa: un ajuste se olvida, una
    // consecuencia se ve.
    mockGet.mockResolvedValue(
      policy({
        templates: {
          ...policy().templates,
          due_today: { enabled: false, body: "Hoy vence tu cuota." },
        },
      }),
    );
    render(<RemindersTab />);

    expect(await screen.findByText(/no se escribe nada/i)).toBeInTheDocument();
  });

  it("con los dos canales apagados dice que NO sale nada, por mucha cadencia", async () => {
    mockGet.mockResolvedValue(
      policy({ reminder_channels: { whatsapp: false, email: false } }),
    );
    render(<RemindersTab />);

    expect(
      await screen.findByText(/no sale.*ning.n.*aviso|ning.n/i),
    ).toBeInTheDocument();
    // Y el hilo no finge que salen mensajes.
    expect(screen.queryByText(/entregado/i)).not.toBeInTheDocument();
  });

  it("quitar un desfase de la cadencia lo guarda sin él", async () => {
    mockGet.mockResolvedValue(policy());
    mockSave.mockResolvedValue(policy({ reminder_days_before: [7, 0] }));
    render(<RemindersTab />);

    fireEvent.click(
      await screen.findByLabelText("Quitar el aviso de 3 días antes de vencer"),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Guardar recordatorios" }),
    );

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ reminder_days_before: [7, 0] }),
      );
    });
  });

  it("dice que lo guardado alcanza a los pedidos que YA están en marcha", async () => {
    // Es la promesa que el servidor tuvo que arreglar en esta fase: si el texto
    // saliera del plan congelado, esta frase sería mentira.
    mockGet.mockResolvedValue(policy());
    mockSave.mockResolvedValue(policy());
    render(<RemindersTab />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Guardar recordatorios" }),
    );

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining(
            "ya están en marcha",
          ) as unknown as string,
        }),
      );
    });
  });

  it("un texto con una variable que el servidor no conoce no se puede guardar", async () => {
    mockGet.mockResolvedValue(policy());
    render(<RemindersTab />);

    fireEvent.click(
      await screen.findByLabelText("Editar el texto de antes de vencer"),
    );
    const textarea = await screen.findByLabelText(
      /Texto del aviso de antes de vencer/i,
    );
    fireEvent.change(textarea, {
      target: { value: "Te doy {{descuento_secreto}}" },
    });

    expect(screen.getByText(/no sabe rellenar/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Guardar el texto" }),
    ).toBeDisabled();
  });

  it("ofrece las variables que el SERVIDOR dice, no una lista copiada", async () => {
    // Si el servidor aprende a rellenar una variable nueva, la pantalla la
    // ofrece sin tocar el cliente; y lo que ofrece es exactamente lo que el
    // renderizador sabe cerrar.
    mockGet.mockResolvedValue(
      policy({ available_variables: ["contact_name", "cupos_restantes"] }),
    );
    render(<RemindersTab />);

    fireEvent.click(
      await screen.findByLabelText("Editar el texto de antes de vencer"),
    );

    expect(
      screen.getByRole("button", { name: "{{cupos_restantes}}" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "{{payment_methods}}" }),
    ).not.toBeInTheDocument();
  });
});
