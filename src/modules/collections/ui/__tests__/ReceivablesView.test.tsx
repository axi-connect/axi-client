import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const mockList = jest.fn<Promise<unknown>, [unknown]>();
const mockStats = jest.fn<Promise<unknown>, []>();
const mockPlan = jest.fn<Promise<unknown>, [string]>();
jest.mock(
  "@/modules/collections/infrastructure/services/collections-service.adapter",
  () => ({
    listReceivables: (params: unknown) => mockList(params),
    getReceivablesStats: () => mockStats(),
    // La cartera abre el diálogo de escribir, que busca el plan del pedido.
    getPlanByOrder: (orderId: string) => mockPlan(orderId),
    sendReminder: () => Promise.resolve({ plan_id: "p1", outcome: "queued" }),
  }),
);

const mockShowAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: mockShowAlert }),
}));
const mockHasPermission = jest.fn<boolean, [string]>(() => true);
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: mockHasPermission }),
}));

import { HttpError } from "@/core/api/problem";
import { ReceivablesView } from "@/modules/collections/ui/ReceivablesView";

const row = (overrides: Record<string, unknown> = {}) => ({
  plan_id: "p1",
  order_id: "o1",
  order_number: 42,
  contact_id: "c1",
  contact_name: "Laura Gómez",
  service_date: null,
  travelled: false,
  last_reminder: null,
  currency: "COP",
  total_cents: 1_000_000,
  paid_cents: 300_000,
  balance_cents: 700_000,
  overdue_cents: 0,
  next_due_at: null,
  days_overdue: 0,
  bucket: "current",
  installments_total: 3,
  installments_paid: 1,
  active_promise_at: null,
  last_promise: null,
  assigned_user_id: null,
  paused: false,
  ...overrides,
});

const stats = (overrides: Record<string, unknown> = {}) => ({
  outstanding_cents: 4_692_720,
  overdue_cents: 1_578_000,
  travelled_cents: 1_230_000,
  promised_cents: 0,
  plans_active: 6,
  plans_overdue: 3,
  contacts_overdue: 3,
  ...overrides,
});

describe("ReceivablesView (F4: la cartera abre con la respuesta)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasPermission.mockImplementation(() => true);
  });

  it("F4b: la promesa se lee en la fila como texto — viva con la fecha y los avisos en pausa, rota si el día pasó sin pago", async () => {
    mockList.mockResolvedValue({
      data: [
        row({
          plan_id: "viva",
          order_id: "viva",
          contact_name: "Diana Salazar",
          days_overdue: 6,
          next_due_at: "2026-09-18",
          active_promise_at: "2026-09-29",
          last_promise: { promised_at: "2026-09-29", status: "pending" },
        }),
        row({
          plan_id: "rota",
          order_id: "rota",
          contact_name: "Andrés Mejía",
          days_overdue: 15,
          next_due_at: "2026-09-09",
          active_promise_at: null,
          last_promise: { promised_at: "2026-09-22", status: "broken" },
        }),
        row({
          plan_id: "quieta",
          order_id: "quieta",
          contact_name: "Laura Gómez",
          last_promise: { promised_at: "2026-08-01", status: "kept" },
        }),
      ],
      meta: { total: 3, page: 1, page_size: 100 },
    });
    mockStats.mockResolvedValue(stats());

    render(<ReceivablesView />);

    expect(
      await screen.findByText(
        /prometió el 29 de sept de 2026 · avisos en pausa/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no cumplió la promesa del 22 de sept/),
    ).toBeInTheDocument();
    // Una promesa cumplida no se dice en la fila: lo que debe es la siguiente cuota
    expect(screen.queryByText(/cumplió la promesa del 1/)).toBeNull();
  });

  it("F4b: «…» en la fila ofrece anotar promesa, reprogramar y abrir el pedido, SOLO con collections:manage; con promesa viva no se ofrece anotar otra", async () => {
    mockList.mockResolvedValue({
      data: [
        row({ plan_id: "a", order_id: "a", contact_name: "Diana Salazar" }),
        row({
          plan_id: "b",
          order_id: "b",
          contact_name: "Marcela Ruiz",
          active_promise_at: "2026-09-29",
          last_promise: { promised_at: "2026-09-29", status: "pending" },
        }),
      ],
      meta: { total: 2, page: 1, page_size: 100 },
    });
    mockStats.mockResolvedValue(stats());
    mockPlan.mockResolvedValue({
      id: "plan-a",
      order_id: "a",
      order_number: 42,
      contact_id: "c1",
      status: "active",
      currency: "COP",
      total_cents: 1_000_000,
      paid_cents: 300_000,
      balance_cents: 700_000,
      deposit_cents: 300_000,
      service_date: null,
      final_due_at: null,
      final_due_source: "fallback",
      next_due_at: "2026-10-01",
      active_promise_at: null,
      assigned_user_id: null,
      installments: [],
      promises: [],
      notes: [],
    });

    render(<ReceivablesView />);
    const more = await screen.findAllByRole("button", { name: /Más acciones/ });
    expect(more).toHaveLength(2);
    // «Escribir» sigue siendo la única diana visible por fila
    expect(screen.getAllByRole("button", { name: /Escribir/ })).toHaveLength(2);

    fireEvent.click(more[0]);
    const items = await screen.findAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining("Anotar promesa de pago"),
      expect.stringContaining("Reprogramar cuotas"),
      expect.stringContaining("Abrir el pedido"),
    ]);
    fireEvent.click(items[0]);
    expect(
      await screen.findByRole("heading", { name: /Anotar promesa de pago/ }),
    ).toBeInTheDocument();
    expect(mockPlan).toHaveBeenCalledWith("a");
    fireEvent.keyDown(document.body, { key: "Escape" });

    // Con promesa viva, «anotar otra» no está: lo que no se puede, no se ofrece
    fireEvent.click(more[1]);
    const busy = await screen.findAllByRole("menuitem");
    expect(busy.map((item) => item.textContent)).toEqual([
      expect.stringContaining("Reprogramar cuotas"),
      expect.stringContaining("Abrir el pedido"),
    ]);
    fireEvent.keyDown(document.body, { key: "Escape" });

    // Sin el permiso, no hay «…»: nada deshabilitado, lo que no se puede no está
    mockHasPermission.mockImplementation(
      (code) => code !== "collections:manage",
    );
    cleanup();
    render(<ReceivablesView />);
    await screen.findAllByRole("button", { name: /Escribir/ });
    expect(screen.queryByRole("button", { name: /Más acciones/ })).toBeNull();
  });

  it("lo primero es cuánto te deben, y la frase nombra los importes", async () => {
    mockList.mockResolvedValue({
      data: [row()],
      meta: { total: 1, page: 1, page_size: 100 },
    });
    mockStats.mockResolvedValue(stats());

    render(<ReceivablesView />);

    expect(await screen.findByText("Te deben")).toBeInTheDocument();
    expect(screen.getByText("$ 46.927")).toBeInTheDocument();
    // Los importes van en la frase; una leyenda de colores los repetiría.
    expect(screen.getByText("$ 15.780")).toBeInTheDocument();
  });

  it("agrupa por urgencia y encabeza con quien ya viajó y debe", async () => {
    mockList.mockResolvedValue({
      data: [
        row({
          plan_id: "a",
          order_id: "a",
          contact_name: "Camilo Ortiz",
          travelled: true,
          days_overdue: 47,
          next_due_at: "2026-08-01",
        }),
        row({
          plan_id: "b",
          order_id: "b",
          contact_name: "Diana Salazar",
          days_overdue: 6,
          next_due_at: "2026-09-11",
        }),
      ],
      meta: { total: 2, page: 1, page_size: 100 },
    });
    mockStats.mockResolvedValue(stats());

    render(<ReceivablesView />);

    const headings = await screen.findAllByRole("heading", { level: 2 });
    expect(headings[0]).toHaveTextContent("Ya viajaron y deben");
    expect(headings[1]).toHaveTextContent("En mora");
    // La mora se dice en días, no en un color.
    expect(screen.getByText("Venció hace 47 días")).toBeInTheDocument();
  });

  it("QA F4-08: la fila dice cuánto de lo que debe está vencido cuando no es todo; si es todo, no lo repite", async () => {
    mockList.mockResolvedValue({
      data: [
        row({
          plan_id: "bruno",
          order_id: "bruno",
          contact_name: "Bruno Díaz",
          days_overdue: 6,
          next_due_at: "2026-09-18",
          balance_cents: 2_056_566_00,
          overdue_cents: 685_522_00,
        }),
        row({
          plan_id: "todo",
          order_id: "todo",
          contact_name: "Camilo Ortiz",
          days_overdue: 47,
          next_due_at: "2026-08-01",
          balance_cents: 8_100_000_00,
          overdue_cents: 8_100_000_00,
        }),
      ],
      meta: { total: 2, page: 1, page_size: 100 },
    });
    mockStats.mockResolvedValue(stats());

    render(<ReceivablesView />);

    // Bruno: el saldo grande y, junto al vencimiento, SOLO lo que falta de la cuota vencida
    expect(await screen.findByText("$ 2.056.566")).toBeInTheDocument();
    expect(screen.getByText(/Venció hace 6 días/)).toHaveTextContent(
      /Venció hace 6 días · \$ 685\.522/,
    );
    // Camilo debe todo y todo está vencido: no se repite la cifra
    expect(screen.getByText(/Venció hace 47 días/)).toHaveTextContent(
      /^Venció hace 47 días$/,
    );
  });

  it("un plan en pausa sigue en la lista, y lo dice", async () => {
    // Pausar no es cancelar: la deuda sigue contando. Esconderla de la lista
    // haría creer que se resolvió.
    mockList.mockResolvedValue({
      data: [row({ paused: true })],
      meta: { total: 1, page: 1, page_size: 100 },
    });
    mockStats.mockResolvedValue(stats());

    render(<ReceivablesView />);

    expect(await screen.findByText("en pausa")).toBeInTheDocument();
  });

  it("sin la función lo dice: no hay cartera, no es una lista vacía", async () => {
    // Savage cobra de una. Un listado vacío haría creer que nadie debe.
    const denied = new HttpError({
      status: 403,
      code: "features/feature_disabled",
      message: "Función deshabilitada",
    });
    mockList.mockRejectedValue(denied);
    mockStats.mockRejectedValue(denied);

    render(<ReceivablesView />);

    expect(await screen.findByText("Aquí no hay cartera")).toBeInTheDocument();
  });

  it("no se calla a las 100 filas: dice cuántas hay y deja traer el resto", async () => {
    // Perder la cola en silencio es el peor fallo posible en una pantalla cuyo
    // propósito entero es «a quién le escribo».
    mockList.mockResolvedValueOnce({
      data: [row({ plan_id: "a", order_id: "a", contact_name: "Primera" })],
      meta: { total: 2, page: 1, page_size: 50 },
    });
    mockStats.mockResolvedValue(stats());

    render(<ReceivablesView />);

    expect(await screen.findByText("Mostrando 1 de 2")).toBeInTheDocument();

    mockList.mockResolvedValueOnce({
      data: [row({ plan_id: "b", order_id: "b", contact_name: "Segunda" })],
      meta: { total: 2, page: 2, page_size: 50 },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ver más" }));

    expect(await screen.findByText("Segunda")).toBeInTheDocument();
    // Y la primera sigue ahí: la tanda nueva se añade, no reemplaza.
    expect(screen.getByText("Primera")).toBeInTheDocument();
  });

  it("§9.4: si la página siguiente falla, la lista lo dice al pie hasta que el reintento lo resuelva; no es un aviso que se va", async () => {
    mockList.mockResolvedValueOnce({
      data: [row({ plan_id: "a", order_id: "a", contact_name: "Primera" })],
      meta: { total: 2, page: 1, page_size: 50 },
    });
    mockStats.mockResolvedValue(stats());
    render(<ReceivablesView />);
    expect(await screen.findByText("Mostrando 1 de 2")).toBeInTheDocument();

    mockList.mockRejectedValueOnce(
      new HttpError({
        status: 500,
        code: "internal/error",
        message: "Se cayó",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Ver más" }));
    const alert = await screen.findByText(
      "No se pudo traer el resto de la cartera",
    );
    expect(alert.closest('[role="alert"], [data-slot="alert"]')).not.toBeNull();
    expect(
      screen.getByText(/La lista muestra solo lo que llegó/),
    ).toBeInTheDocument();
    expect(screen.getByText("Primera")).toBeInTheDocument();
    expect(mockShowAlert).not.toHaveBeenCalled();

    mockList.mockResolvedValueOnce({
      data: [row({ plan_id: "b", order_id: "b", contact_name: "Segunda" })],
      meta: { total: 2, page: 2, page_size: 50 },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ver más" }));
    expect(await screen.findByText("Segunda")).toBeInTheDocument();
    expect(
      screen.queryByText("No se pudo traer el resto de la cartera"),
    ).toBeNull();
  });

  it("un fallo de red NO se disfraza de «no te debe nadie»", async () => {
    // Es el mismo principio del 403, una rama más allá: una lista vacía haría
    // creer que la cartera está limpia.
    mockList.mockRejectedValue(
      new HttpError({
        status: 500,
        code: "internal/error",
        message: "Se cayó",
      }),
    );
    mockStats.mockRejectedValue(
      new HttpError({
        status: 500,
        code: "internal/error",
        message: "Se cayó",
      }),
    );

    render(<ReceivablesView />);

    expect(
      await screen.findByText("No se pudo cargar la cartera"),
    ).toBeInTheDocument();
    expect(screen.queryByText("No te debe nadie")).toBeNull();
  });

  it("el titular sigue al filtro en vez de describir otra cosa", async () => {
    mockList.mockResolvedValue({
      data: [row()],
      meta: { total: 1, page: 1, page_size: 50 },
    });
    mockStats.mockResolvedValue(stats());

    render(<ReceivablesView />);
    await screen.findByText("Te deben");

    fireEvent.click(screen.getByRole("button", { name: /En mora/ }));

    // La cabecera es lo primero que se lee: dejarla en las cifras globales
    // mientras la lista está filtrada las hace contar cosas distintas.
    expect(await screen.findByText("Vencido")).toBeInTheDocument();
  });

  it("cada fila lleva a su pedido, con una sola diana", async () => {
    mockList.mockResolvedValue({
      data: [row()],
      meta: { total: 1, page: 1, page_size: 100 },
    });
    mockStats.mockResolvedValue(stats());

    render(<ReceivablesView />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Laura Gómez/ })).toHaveAttribute(
        "href",
        "/orders/o1",
      );
    });
  });

  it("dice cuándo se avisó por última vez, y que NO salió", async () => {
    // Es lo que hay que saber ANTES de escribirle a mano: un aviso que no
    // salió cambia lo que el operador hace, y por eso no puede leerse igual
    // que uno entregado.
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    mockList.mockResolvedValue({
      data: [
        row({
          plan_id: "p-mudo",
          contact_name: "Marcela Ruiz",
          last_reminder: {
            at: ayer.toISOString(),
            status: "skipped",
            channel: "whatsapp",
            skip_reason: "outside_service_window_no_hsm",
          },
        }),
        row({ plan_id: "p-nuevo", contact_name: "Julián Torres" }),
      ],
      meta: { total: 2, page: 1, page_size: 25 },
    });
    mockStats.mockResolvedValue(stats());

    render(<ReceivablesView />);

    expect(await screen.findByText(/No salió ayer/)).toBeInTheDocument();
    expect(screen.getByText(/sin plantilla aprobada/i)).toBeInTheDocument();
    // Y quien no ha recibido nada lo dice, en vez de callar.
    expect(screen.getByText("Sin avisos todavía")).toBeInTheDocument();
  });

  it("cada deudor tiene su botón de escribir, y abre el suyo", async () => {
    mockList.mockResolvedValue({
      data: [row({ plan_id: "p1", contact_name: "Laura Gómez" })],
      meta: { total: 1, page: 1, page_size: 25 },
    });
    mockStats.mockResolvedValue(stats());

    render(<ReceivablesView />);

    mockPlan.mockRejectedValue(new Error("sin plan"));
    fireEvent.click(await screen.findByRole("button", { name: /Escribir/i }));

    expect(
      await screen.findByText(/Escribir a Laura Gómez/i),
    ).toBeInTheDocument();
  });
});
