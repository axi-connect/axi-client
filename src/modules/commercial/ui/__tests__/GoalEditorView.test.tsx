import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { resetCommercialStore, useCommercialStore } from "@/modules/commercial/infrastructure/stores/commercial.store";
import { GoalEditorView } from "../GoalEditorView";
import { goal, goalResponse, pace, plan } from "./fixtures";

type Ent = { entitlements: null; loaded: boolean; hasCapability: (code: string) => boolean };
const mockEntitlements = jest.fn<Ent, []>(() => ({ entitlements: null, loaded: true, hasCapability: () => true }));
jest.mock("@/shared/auth/entitlements.hooks", () => ({ useEntitlements: () => mockEntitlements() }));
jest.mock("@/modules/companies/public", () => ({ useMyCompany: () => ({ company: { currency: "COP" } }) }));
const permissions = new Set(["commercial:read", "commercial:manage"]);
jest.mock("@/shared/auth/auth.hooks", () => ({ useAuth: () => ({ hasPermission: (code: string) => permissions.has(code) }) }));
const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push, back: jest.fn() }) }));
const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert }) }));

const load = jest.fn().mockResolvedValue(undefined);
const previewPlan = jest.fn().mockResolvedValue(undefined);
const saveGoal = jest.fn();

afterEach(() => {
  cleanup();
  jest.useRealTimers();
});
beforeEach(() => {
  resetCommercialStore();
  load.mockClear();
  previewPlan.mockClear();
  saveGoal.mockReset();
  push.mockClear();
  showAlert.mockClear();
  permissions.add("commercial:read");
  permissions.add("commercial:manage");
  mockEntitlements.mockReturnValue({ entitlements: null, loaded: true, hasCapability: () => true });
  useCommercialStore.setState({ load, previewPlan, saveGoal });
});

const withData = () =>
  useCommercialStore.setState({
    goal: { status: "ready", data: goalResponse, error: null },
    pace: { status: "ready", data: pace, error: null },
  });

describe("GoalEditorView", () => {
  it("sin la capacidad crm es el bloqueado, no un skeleton infinito", () => {
    mockEntitlements.mockReturnValue({ entitlements: null, loaded: true, hasCapability: () => false });
    render(<GoalEditorView />);
    expect(screen.getByText("Comercial no está en tu plan")).toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
  });

  it("el 403 del servidor bloquea igual", () => {
    useCommercialStore.setState({ blocker: "no_plan", goal: { status: "ready", data: null, error: null } });
    render(<GoalEditorView />);
    expect(screen.getByText("Comercial no está en tu plan")).toBeInTheDocument();
  });

  it("con error de red no pinta un formulario vacío: ofrece reintentar", () => {
    useCommercialStore.setState({ goal: { status: "error", data: null, error: "Sin conexión" } });
    render(<GoalEditorView />);
    expect(screen.getByText("No pude cargar la meta")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /guardar meta/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("sin commercial:manage no hay formulario", () => {
    permissions.delete("commercial:manage");
    withData();
    render(<GoalEditorView />);
    expect(screen.getByText("Solo un administrador puede cambiar la meta")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /guardar meta/i })).toBeNull();
    expect(previewPlan).not.toHaveBeenCalled();
  });

  it("arranca con la meta actual, pide la vista previa con debounce y a mitad de mes avisa", async () => {
    jest.useFakeTimers();
    withData();
    render(<GoalEditorView />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("¿Cuánto quieres vender en septiembre?");
    expect(screen.getByLabelText("Meta del mes en COP")).toHaveValue("30.000.000");
    expect(screen.getByText(/Llevas \$ 18,9 M y 27 ventas/)).toBeInTheDocument();

    expect(previewPlan).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(previewPlan).toHaveBeenCalledTimes(1);
    expect(previewPlan).toHaveBeenLastCalledWith({ target_revenue_cents: 3_000_000_000, declared_avg_ticket_cents: null, declared_close_rate_pct: null });
  });

  it("los atajos sobre el mes pasado fijan la cifra", async () => {
    jest.useFakeTimers();
    withData();
    render(<GoalEditorView />);
    fireEvent.click(screen.getByRole("radio", { name: "+10 %" }));
    expect(screen.getByLabelText("Meta del mes en COP")).toHaveValue("24.310.000");
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(previewPlan).toHaveBeenLastCalledWith(expect.objectContaining({ target_revenue_cents: 2_431_000_000 }));
  });

  it("pinta «Lo que implica» con procedencia y avisa si el plan está incompleto", () => {
    withData();
    useCommercialStore.setState({ preview: { status: "ready", data: { ...plan, status: "incomplete" }, error: null } });
    render(<GoalEditorView />);
    expect(screen.getByText("Ventas necesarias")).toBeInTheDocument();
    expect(screen.getByText(/38 % de las cotizaciones se venden/)).toBeInTheDocument();
    expect(screen.getByText(/Falta tu ticket promedio/)).toBeInTheDocument();
  });

  it("sin ticket, las cifras dicen que falta el ticket: ni ceros ni procedencia (Q16)", () => {
    withData();
    const zero = { value: 0, source: "benchmark" as const, basis: null };
    const incomplete = {
      ...plan,
      status: "incomplete" as const,
      inputs: { ...plan.inputs, avg_ticket_cents: null },
      figures: Object.fromEntries(Object.entries(plan.figures).map(([key, figure]) => [key, figure === null ? null : { ...figure, ...zero }])) as typeof plan.figures,
    };
    useCommercialStore.setState({ preview: { status: "ready", data: incomplete, error: null } });
    render(<GoalEditorView />);
    const list = screen.getByRole("region", { name: "Lo que implica" });
    expect(within(list).getAllByText("Falta el ticket").length).toBeGreaterThan(1);
    expect(within(list).queryByText(/^≈?\s*0$/)).toBeNull();
    expect(within(list).queryByText(/supuesto para|según tu historia|lo dijiste tú/)).toBeNull();
    // La tasa sí es cierta y se deja.
    expect(within(list).getByText(/38 % de las cotizaciones se venden/)).toBeInTheDocument();
  });

  it("con ticket, las cifras llevan su valor y su procedencia", () => {
    withData();
    useCommercialStore.setState({ preview: { status: "ready", data: plan, error: null } });
    render(<GoalEditorView />);
    expect(screen.getByText("43")).toBeInTheDocument();
    expect(screen.queryByText("Falta el ticket")).toBeNull();
  });

  it("si la vista previa falla con cifras viejas, las atenúa y lo dice", () => {
    withData();
    useCommercialStore.setState({ preview: { status: "error", data: plan, error: "Sin conexión" } });
    render(<GoalEditorView />);
    expect(screen.getByText(/lo de abajo es de la anterior/)).toBeInTheDocument();
    expect(screen.getByRole("list")).toHaveClass("opacity-60");
  });

  it("guardar confirma con la voz «progreso» y vuelve a la ruta; el error se pinta", async () => {
    withData();
    saveGoal.mockResolvedValueOnce(goal);
    render(<GoalEditorView />);
    fireEvent.click(screen.getByRole("button", { name: /guardar meta/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/comercial"));
    expect(saveGoal).toHaveBeenCalledWith({ target_revenue_cents: 3_000_000_000, declared_avg_ticket_cents: null, declared_close_rate_pct: null });
    expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ title: "Meta puesta. Empezamos a medir el camino." }));

    saveGoal.mockRejectedValueOnce(new Error("La meta no puede ser cero"));
    fireEvent.click(screen.getByRole("button", { name: /guardar meta/i }));
    expect(await screen.findByText("La meta no puede ser cero")).toBeInTheDocument();
  });
});
