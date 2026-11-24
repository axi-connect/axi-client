import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ProviderBalance, ProviderBalances } from "../../../../domain/balances";
import { BalancesView } from "../BalancesView";

const mockReplace = jest.fn();
let mockSearch = "";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  usePathname: () => "/platform/balances",
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert: jest.fn() }) }));

jest.mock("@/shared/components/features/detail-sheet", () => ({
  DetailSheet: ({
    open,
    title,
    headerExtra,
    children,
  }: {
    open: boolean;
    title?: React.ReactNode;
    headerExtra?: React.ReactNode;
    children?: React.ReactNode;
  }) =>
    open ? (
      <div role="dialog" aria-label="detalle">
        <h2>{title}</h2>
        {headerExtra}
        {children}
      </div>
    ) : null,
}));

const base = (extra: Partial<ProviderBalance>): ProviderBalance => ({
  id: "x",
  name: "X",
  use: "Uso",
  impact: "algo se detiene",
  level: "ok",
  probe: null,
  measurable: false,
  balance_usd: null,
  balance_source: null,
  runway_days: null,
  spend_7d_usd: null,
  spend_breakdown: [],
  last_success_at: null,
  checked_at: null,
  check_error: null,
  loaded_amount_usd: null,
  loaded_at: null,
  thresholds: { warn_days: 7, warn_usd: 10, critical_days: 2, critical_usd: 3 },
  incident: null,
  ...extra,
});

const DATA: ProviderBalances = {
  worst_level: "critical",
  counts: { critical: 1, warning: 1, ok: 1, unknown: 0 },
  checked_at: "2026-11-24T16:30:00Z",
  providers: [
    base({
      id: "openai",
      name: "OpenAI",
      use: "Agentes, llamadas y resúmenes",
      impact: "la IA de todas las empresas está detenida",
      level: "critical",
      probe: "openai_admin",
      measurable: true,
      balance_usd: 0,
      balance_source: "estimated",
      runway_days: 0,
      spend_7d_usd: 38.6,
      spend_breakdown: [
        { label: "Production", usd: 24.9 },
        { label: "Sandbox", usd: 13.7 },
      ],
      loaded_amount_usd: 50,
      loaded_at: "2026-11-10T17:00:00Z",
      incident: {
        id: "i-1",
        kind: "no_funds",
        since: "2026-11-24T14:45:00Z",
        last_seen_at: "2026-11-24T16:28:00Z",
        failure_count: 18,
        sample: "You have no credits remaining",
        notified_at: "2026-11-24T14:46:00Z",
        next_reminder_at: "2026-11-24T20:46:00Z",
      },
    }),
    base({
      id: "twilio",
      name: "Twilio",
      use: "Llamadas",
      level: "warning",
      probe: "twilio",
      measurable: true,
      balance_usd: 18.4,
      balance_source: "exact",
      runway_days: 6,
      spend_7d_usd: 21.3,
    }),
    base({ id: "groq", name: "Groq", use: "Notas de voz", spend_7d_usd: 0.42, last_success_at: "2026-11-24T16:12:00Z" }),
  ],
};

const mockRefresh = jest.fn();
const mockUpdate = jest.fn();
const mockResolve = jest.fn();
let mockQuery: Record<string, unknown>;

jest.mock("../../../../infrastructure/api/hooks/use-balances", () => ({
  useBalancesQuery: () => mockQuery,
  useRefreshBalances: () => ({ mutateAsync: mockRefresh, isPending: false }),
  useUpdateBalance: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useResolveIncident: () => ({ mutateAsync: mockResolve, isPending: false }),
}));

const ok = { data: DATA, isPending: false, isSuccess: true, isError: false, error: null, refetch: jest.fn(), dataUpdatedAt: 1 };

describe("Dinero › Saldos", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch = "";
    mockQuery = ok;
    mockUpdate.mockResolvedValue(DATA);
    mockResolve.mockResolvedValue(DATA);
    mockRefresh.mockResolvedValue(DATA);
  });

  it("una tabla, lo peor primero, con estado, saldo, días y la última señal", () => {
    render(<BalancesView />);
    expect(screen.getByRole("heading", { level: 1, name: "Saldos" })).toBeInTheDocument();
    expect(screen.getByLabelText("Resumen")).toHaveTextContent("1 crítico1 bajo1 bien");
    const table = screen.getByRole("table", { name: "Saldos de proveedores" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((tr) => within(tr).getAllByRole("cell")[0]?.textContent)).toEqual([
      "OOpenAIAgentes, llamadas y resúmenes",
      "TTwilioLlamadas",
      "GGroqNotas de voz",
    ]);
    expect(within(rows[0]!).getByText("Sin saldo")).toBeInTheDocument();
    expect(within(rows[0]!).getByText("cargado − gastado")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("Bajo")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("6 días")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("sin consulta de saldo")).toBeInTheDocument();
    expect(within(rows[2]!).getByText(/Respondió bien/)).toBeInTheDocument();
  });

  it("tocar una fila abre su detalle por la URL (?proveedor=)", () => {
    render(<BalancesView />);
    fireEvent.click(screen.getByRole("row", { name: /Ver el detalle de Twilio/ }));
    expect(mockReplace).toHaveBeenCalledWith("/platform/balances?proveedor=twilio", { scroll: false });
  });

  it("detalle de OpenAI: desde cuándo, el cálculo, el gasto por proyecto, la recarga y los umbrales", async () => {
    mockSearch = "proveedor=openai";
    render(<BalancesView />);
    const sheet = screen.getByRole("dialog", { name: "detalle" });
    expect(within(sheet).getByRole("alert")).toHaveTextContent(/Sin saldo desde las/);
    expect(within(sheet).getByRole("alert")).toHaveTextContent(/18 peticiones rechazadas/);
    // Recarga US$ 50 − gastado US$ 50 = queda US$ 0
    const figure = (label: string) => within(sheet).getByText(label).parentElement;
    expect(figure("Última recarga")).toHaveTextContent("US$ 50,00");
    expect(figure("Gastado desde ahí")).toHaveTextContent("US$ 50,00");
    expect(figure("Queda")).toHaveTextContent("US$ 0,00");
    expect(within(sheet).getByText("Sandbox")).toBeInTheDocument();

    fireEvent.change(within(sheet).getByLabelText("Monto (US$)"), { target: { value: "100" } });
    fireEvent.change(within(sheet).getByLabelText("Fecha"), { target: { value: "2026-11-24" } });
    fireEvent.click(within(sheet).getByRole("button", { name: "Guardar recarga" }));
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({ loaded_amount_usd: 100, loaded_at: "2026-11-24T12:00:00.000-05:00" }),
    );
  });

  it("umbrales: el crítico no puede pasar al aviso; guardar manda solo números", async () => {
    mockSearch = "proveedor=twilio";
    render(<BalancesView />);
    const sheet = screen.getByRole("dialog", { name: "detalle" });
    const save = within(sheet).getByRole("button", { name: "Guardar umbrales" });
    expect(save).toBeDisabled();
    fireEvent.change(within(sheet).getByLabelText(/Crítico: alcanza para/), { target: { value: "9" } });
    expect(within(sheet).getByText("El crítico no puede ser más alto que el aviso.")).toBeInTheDocument();
    expect(save).toBeDisabled();
    fireEvent.change(within(sheet).getByLabelText(/Crítico: alcanza para/), { target: { value: "3" } });
    fireEvent.click(save);
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({
        thresholds: { warn_days: 7, warn_usd: 10, critical_days: 3, critical_usd: 3 },
      }),
    );
  });

  it("un proveedor sin sonda explica que se vigila por errores y no ofrece formularios", () => {
    mockSearch = "proveedor=groq";
    render(<BalancesView />);
    const sheet = screen.getByRole("dialog", { name: "detalle" });
    expect(within(sheet).getByText(/no deja consultar su saldo/)).toBeInTheDocument();
    expect(within(sheet).queryByRole("button", { name: /Guardar/ })).toBeNull();
  });

  it("cerrar el incidente a mano", async () => {
    mockSearch = "proveedor=openai";
    render(<BalancesView />);
    fireEvent.click(screen.getByRole("button", { name: "Marcar como resuelto" }));
    await waitFor(() => expect(mockResolve).toHaveBeenCalledWith("i-1"));
  });

  it("error ≠ vacío: si la lista falla se ve el error con «Reintentar», nunca una tabla vacía", () => {
    mockQuery = { data: undefined, isPending: false, isSuccess: false, isError: true, error: new Error("caída"), refetch: jest.fn(), dataUpdatedAt: 0 };
    render(<BalancesView />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
