import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { PlanDetailDTO } from "@/modules/collections/domain/payment-plan";

const mockPlan = jest.fn<Promise<PlanDetailDTO>, [string]>();
jest.mock(
  "@/modules/collections/infrastructure/services/collections-service.adapter",
  () => ({
    getPlanByOrder: (orderId: string) => mockPlan(orderId),
    getPlanReminders: () => Promise.resolve({ data: [] }),
    recordPromise: jest.fn(),
    reschedulePlan: jest.fn(),
    addPlanNote: jest.fn(),
    sendReminder: jest.fn(),
  }),
);
const mockHasPermission = jest.fn<boolean, [string]>(() => true);
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: mockHasPermission }),
}));
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn() }),
}));

import { PaymentPlanBlock } from "@/modules/collections/ui/components/PaymentPlanBlock";

const plan = (overrides: Partial<PlanDetailDTO> = {}): PlanDetailDTO => ({
  id: "plan-1",
  order_id: "o1",
  order_number: 47,
  contact_id: "c1",
  status: "active",
  currency: "COP",
  total_cents: 1_160_000_000,
  paid_cents: 348_000_000,
  balance_cents: 812_000_000,
  deposit_cents: 348_000_000,
  service_date: "2027-03-14",
  final_due_at: "2027-01-13",
  final_due_source: "service_date",
  next_due_at: "2026-09-10",
  active_promise_at: null,
  assigned_user_id: null,
  installments: [
    {
      id: "i1",
      seq: 1,
      kind: "deposit",
      due_at: "2026-07-02",
      amount_cents: 348_000_000,
      paid_cents: 348_000_000,
      status: "paid",
      paid_at: "2026-07-02T10:00:00.000Z",
    },
    {
      id: "i2",
      seq: 2,
      kind: "installment",
      due_at: "2026-09-10",
      amount_cents: 348_000_000,
      paid_cents: 0,
      status: "overdue",
      paid_at: null,
    },
    {
      id: "i3",
      seq: 3,
      kind: "balance",
      due_at: "2027-01-13",
      amount_cents: 464_000_000,
      paid_cents: 0,
      status: "pending",
      paid_at: null,
    },
  ],
  promises: [],
  notes: [],
  collapsed: false,
  schedule_changed_at: null,
  ...overrides,
});

const promise = (
  overrides: Partial<PlanDetailDTO["promises"][number]> = {},
) => ({
  id: "pr1",
  promised_at: "2026-09-22",
  amount_cents: 348_000_000,
  note: "Cobra el 20 y paga ese día",
  status: "pending" as const,
  created_at: "2026-09-16T15:00:00.000Z",
  resolved_at: null,
  created_by_user_id: "u1",
  ...overrides,
});

describe("PaymentPlanBlock · promesas, historial y nota (F4b)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasPermission.mockImplementation(() => true);
  });

  it("viva: la tarjeta info con la frase, la nota y «Escribir»; el historial la lista; el botón de anotar desaparece", async () => {
    mockPlan.mockResolvedValue(
      plan({ active_promise_at: "2026-09-22", promises: [promise()] }),
    );
    render(<PaymentPlanBlock orderId="o1" contactName="Diana Salazar" />);
    expect(
      await screen.findByText(
        /Prometió pagar \$ 3\.480\.000 el 22 de sept de 2026\./,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Cobra el 20 y paga ese día/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Escribir/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Anotar promesa de pago/ }),
    ).toBeNull();
    expect(
      screen.getByRole("list", { name: "Historial de promesas" }),
    ).toHaveTextContent(/Promesa anotada para el 22 de sept/);
  });

  it("rota: la tarjeta ámbar con la consecuencia y «Anotar otra promesa»; cumplida: verde y sin salidas", async () => {
    mockPlan.mockResolvedValue(
      plan({
        promises: [
          promise({
            status: "broken",
            resolved_at: "2026-09-23T05:00:00.000Z",
          }),
        ],
      }),
    );
    const { unmount } = render(<PaymentPlanBlock orderId="o1" />);
    expect(
      await screen.findByText(/No cumplió la promesa del 22 de sept/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/volvieron solos el 23 de sept/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Anotar otra promesa/ }),
    ).toBeInTheDocument();
    unmount();

    mockPlan.mockResolvedValue(
      plan({
        promises: [
          promise({ status: "kept", resolved_at: "2026-09-21T14:00:00.000Z" }),
        ],
      }),
    );
    render(<PaymentPlanBlock orderId="o1" />);
    expect(
      await screen.findByText(/Cumplió la promesa del 22 de sept/),
    ).toBeInTheDocument();
    expect(screen.getByText(/un día antes/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Anotar otra promesa/ }),
    ).toBeNull();
  });

  it("la nota del plan al pie con «Editar»; sin nota, «Añadir»; sin permiso, ni botones ni «Reprogramar»", async () => {
    mockPlan.mockResolvedValue(
      plan({
        notes: [
          {
            id: "n2",
            note: "Llamar antes de escribir",
            created_at: "2026-09-16T16:00:00.000Z",
            actor_user_id: "u1",
          },
          {
            id: "n1",
            note: "Cobra el 20",
            created_at: "2026-09-10T16:00:00.000Z",
            actor_user_id: "u1",
          },
        ],
      }),
    );
    const { unmount } = render(<PaymentPlanBlock orderId="o1" />);
    // La más reciente manda
    expect(
      await screen.findByText(/Llamar antes de escribir/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^Cobra el 20$/)).toBeNull();
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reprogramar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Anotar promesa de pago/ }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(
      await screen.findByRole("heading", { name: "Nota del plan" }),
    ).toBeInTheDocument();
    unmount();

    mockHasPermission.mockImplementation(
      (code) => code !== "collections:manage",
    );
    mockPlan.mockResolvedValue(plan());
    render(<PaymentPlanBlock orderId="o1" />);
    expect(await screen.findByText(/Sin nota\./)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Añadir" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reprogramar" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Anotar promesa de pago/ }),
    ).toBeNull();
  });

  it("QA F5: un plan colapsado lo dice con la fecha de la salida; uno normal no habla de eso", async () => {
    mockPlan.mockResolvedValue(
      plan({
        collapsed: true,
        service_date: "2026-10-01",
        installments: [
          {
            id: "i1",
            seq: 1,
            kind: "balance",
            due_at: "2026-09-24",
            amount_cents: 1_160_000_000,
            paid_cents: 0,
            status: "pending",
            paid_at: null,
          },
        ],
      }),
    );
    const { unmount } = render(<PaymentPlanBlock orderId="o1" />);
    expect(
      await screen.findByText(
        /La salida es el 01 de oct de 2026: no hubo tiempo para cuotas\./,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Todo vence en un solo pago, sin anticipo/),
    ).toBeInTheDocument();
    unmount();
    mockPlan.mockResolvedValue(plan());
    render(<PaymentPlanBlock orderId="o1" />);
    await screen.findByText(/Plan de pagos/);
    expect(screen.queryByText(/no hubo tiempo para cuotas/)).toBeNull();
  });

  it("QA F5: al confirmar, el plan nace en segundo plano: un 404 se reintenta y la sección aparece sin recargar", async () => {
    jest.useFakeTimers();
    const { HttpError } = await import("@/core/api/problem");
    mockPlan
      .mockRejectedValueOnce(
        new HttpError({
          status: 404,
          code: "collections/plan_not_found",
          message: "aún no",
        }),
      )
      .mockResolvedValueOnce(plan());
    const { container } = render(<PaymentPlanBlock orderId="o1" />);
    await waitFor(() => expect(mockPlan).toHaveBeenCalledTimes(1));
    // Tras el 404 la sección está en blanco, no rota
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    await jest.advanceTimersByTimeAsync(800);
    await waitFor(() => expect(mockPlan).toHaveBeenCalledTimes(2));
    jest.useRealTimers();
    expect(await screen.findByText(/Plan de pagos/)).toBeInTheDocument();
    // Y si el pedido cambia (refreshKey), se vuelve a pedir
  });

  it("QA F9-04: con el plan saldado, el historial vacío dice que está al día, no que «el primer aviso sale solo»", async () => {
    mockPlan.mockResolvedValue(
      plan({ status: "settled", balance_cents: 0, paid_cents: 1_160_000_000 }),
    );
    const { unmount } = render(<PaymentPlanBlock orderId="o1" />);
    expect(
      await screen.findByText("Está al día: no hay nada que recordarle."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/El primer aviso sale solo/)).toBeNull();
    unmount();
    mockPlan.mockResolvedValue(plan());
    render(<PaymentPlanBlock orderId="o1" />);
    expect(
      await screen.findByText(/El primer aviso sale solo/),
    ).toBeInTheDocument();
  });

  it("«Anotar promesa de pago» y «Reprogramar» abren sus diálogos", async () => {
    mockPlan.mockResolvedValue(plan());
    render(<PaymentPlanBlock orderId="o1" contactName="Diana Salazar" />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Anotar promesa de pago/ }),
    );
    expect(
      await screen.findByRole("heading", { name: /Anotar promesa de pago/ }),
    ).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Reprogramar" }));
    expect(
      await screen.findByRole("heading", { name: /Reprogramar cuotas/ }),
    ).toBeInTheDocument();
    await waitFor(() => expect(mockPlan).toHaveBeenCalledTimes(3));
  });
});
