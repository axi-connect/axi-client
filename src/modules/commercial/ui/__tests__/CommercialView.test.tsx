import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { resetCommercialStore, useCommercialStore } from "@/modules/commercial/infrastructure/stores/commercial.store";
import { CommercialView } from "../CommercialView";
import { goalResponse, pace, plan, proposal } from "./fixtures";

type Ent = { entitlements: null; loaded: boolean; hasCapability: (code: string) => boolean };
const mockEntitlements = jest.fn<Ent, []>(() => ({ entitlements: null, loaded: true, hasCapability: () => true }));
jest.mock("@/modules/commercial/infrastructure/realtime/use-commercial-realtime", () => ({ useCommercialRealtime: () => undefined }));
jest.mock("@/shared/auth/entitlements.hooks", () => ({ useEntitlements: () => mockEntitlements() }));
jest.mock("@/modules/companies/public", () => ({ useMyCompany: () => ({ company: { currency: "COP" } }) }));
const permissions = new Set(["commercial:read", "commercial:manage"]);
jest.mock("@/shared/auth/auth.hooks", () => ({ useAuth: () => ({ hasPermission: (code: string) => permissions.has(code) }) }));
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }) }));
const mockShowAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert: mockShowAlert }) }));
jest.mock("framer-motion", () => ({ useReducedMotion: () => true, animate: () => ({ stop: () => {} }) }));

const load = jest.fn().mockResolvedValue(undefined);
const loadProposals = jest.fn().mockResolvedValue(undefined);
const approveProposal = jest.fn().mockResolvedValue({ applied: [], failed: [], status: "approved" });

afterEach(cleanup);
beforeEach(() => {
  resetCommercialStore();
  load.mockClear();
  loadProposals.mockClear();
  approveProposal.mockClear();
  mockPush.mockClear();
  permissions.add("commercial:read");
  permissions.add("commercial:approve");
  mockEntitlements.mockReturnValue({ entitlements: null, loaded: true, hasCapability: () => true });
  useCommercialStore.setState({ load, loadProposals, approveProposal });
});

describe("CommercialView", () => {
  it("al desmontar cancela el reintento de un ritmo caducado (V4)", () => {
    const cancelStaleRetry = jest.fn();
    useCommercialStore.setState({ cancelStaleRetry });
    const { unmount } = render(<CommercialView />);
    expect(cancelStaleRetry).not.toHaveBeenCalled();
    unmount();
    expect(cancelStaleRetry).toHaveBeenCalledTimes(1);
  });

  it("mientras las capacidades cargan NO se pinta el bloqueado: se espera", () => {
    mockEntitlements.mockReturnValue({ entitlements: null, loaded: false, hasCapability: () => false });
    render(<CommercialView />);
    expect(screen.queryByText("Comercial no está en tu plan")).toBeNull();
    expect(screen.getByRole("status", { name: /cargando la ruta/i })).toBeInTheDocument();
  });

  it("sin la capacidad crm: bloqueado sin código crudo y sin pedir nada al servidor", () => {
    mockEntitlements.mockReturnValue({ entitlements: null, loaded: true, hasCapability: () => false });
    render(<CommercialView />);
    expect(screen.getByText("Comercial no está en tu plan")).toBeInTheDocument();
    expect(screen.queryByText(/403|capability_not_granted/)).toBeNull();
    expect(screen.getByRole("link", { name: /ver planes/i })).toHaveAttribute("href", "/billing");
    expect(load).not.toHaveBeenCalled();
  });

  it("el 403 del servidor también bloquea", () => {
    useCommercialStore.setState({ blocker: "no_plan", goal: { status: "ready", data: null, error: null } });
    render(<CommercialView />);
    expect(screen.getByText("Comercial no está en tu plan")).toBeInTheDocument();
  });

  it("sin permiso de lectura no hay pantalla ni petición", () => {
    permissions.delete("commercial:read");
    render(<CommercialView />);
    expect(screen.getByText("No tienes acceso a Comercial")).toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
  });

  it("sin meta: el vacío propone con la semilla de la historia", () => {
    useCommercialStore.setState({ goal: { status: "ready", data: { ...goalResponse, goal: null }, error: null } });
    render(<CommercialView />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^Tu ruta de /);
    expect(screen.getByText(/Ponle una meta a/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /definir la meta/i })).toHaveAttribute("href", "/comercial/meta");
    expect(screen.getByText(/El mes pasado vendiste/)).toBeInTheDocument();
  });

  it("al ritmo y sin propuestas, «Axi propone» sí dice «Estás al día» (Q12)", () => {
    useCommercialStore.setState({
      goal: { status: "ready", data: goalResponse, error: null },
      plan: { status: "ready", data: plan, error: null },
      pace: { status: "ready", data: { ...pace, status: "on_track" }, error: null },
      proposals: { status: "ready", data: [], error: null },
    });
    render(<CommercialView />);
    expect(screen.getByText(/Estás al día/)).toBeInTheDocument();
  });

  it("con meta: cabecera con procedencia, hero, ritmo, resultados y «Axi propone» vacío", () => {
    useCommercialStore.setState({
      goal: { status: "ready", data: goalResponse, error: null },
      plan: { status: "ready", data: plan, error: null },
      pace: { status: "ready", data: pace, error: null },
      proposals: { status: "ready", data: [], error: null },
    });
    render(<CommercialView />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Tu ruta de septiembre");
    expect(screen.getByText(/Meta del mes: .*30\.000\.000.*la pusiste tú el 1 sep/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /cambiar meta/i })).toHaveAttribute("href", "/comercial/meta");
    expect(screen.getByRole("region", { name: "La ruta del mes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Resultados clave" })).toBeInTheDocument();
    // Lista vacía DE VERDAD con la ruta en ritmo bajo: «Estás al día» sería falso (Q12).
    expect(screen.getByText("Axi está buscando qué puede acelerar la ruta; las propuestas salen al cerrar el día.")).toBeInTheDocument();
    expect(screen.queryByText(/Estás al día/)).toBeNull();
    // Las filas y el ritmo abren su detalle.
    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/comercial/resultados/sales");
    expect(hrefs).toContain("/comercial/resultados/avg_ticket");
    expect(hrefs).toContain("/comercial/resultados/calls");
    // Ya había datos: no se vuelve a cargar la meta; las propuestas sí se piden.
    expect(load).not.toHaveBeenCalled();
    expect(loadProposals).toHaveBeenCalledTimes(1);
  });

  it("con propuestas: la pendiente enlaza a su detalle y «Aprobar» aprueba y lo abre", async () => {
    useCommercialStore.setState({
      goal: { status: "ready", data: goalResponse, error: null },
      plan: { status: "ready", data: plan, error: null },
      pace: { status: "ready", data: pace, error: null },
      proposals: { status: "ready", data: [proposal], error: null },
    });
    render(<CommercialView />);
    const actions = screen.getByRole("region", { name: "Axi propone" });
    expect(within(actions).getByRole("link", { name: proposal.title })).toHaveAttribute("href", `/comercial/acciones/${proposal.id}`);
    expect(within(actions).getByText("+2 ventas estimadas · cubre el 20 % de lo que falta para volver al ritmo")).toBeInTheDocument();
    fireEvent.click(within(actions).getByRole("button", { name: /Aprobar/ }));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(`/comercial/acciones/${proposal.id}`);
    });
    expect(approveProposal).toHaveBeenCalledWith(proposal.id);
  });

  it("sin permiso de aprobar: la fila enlaza, sin botón, y dice a quién pedírselo", () => {
    permissions.delete("commercial:approve");
    useCommercialStore.setState({
      goal: { status: "ready", data: goalResponse, error: null },
      plan: { status: "ready", data: plan, error: null },
      pace: { status: "ready", data: pace, error: null },
      proposals: { status: "ready", data: [proposal], error: null },
    });
    render(<CommercialView />);
    const actions = screen.getByRole("region", { name: "Axi propone" });
    expect(within(actions).queryByRole("button", { name: /Aprobar/ })).toBeNull();
    expect(within(actions).getByText(/Pídele a un administrador que apruebe/)).toBeInTheDocument();
  });

  it("con permiso pero sin crm_ai: la fila enlaza, sin botón, y dice que el plan no lo incluye (C5)", () => {
    mockEntitlements.mockReturnValue({ entitlements: null, loaded: true, hasCapability: (code) => code !== "crm_ai" });
    useCommercialStore.setState({
      goal: { status: "ready", data: goalResponse, error: null },
      plan: { status: "ready", data: plan, error: null },
      pace: { status: "ready", data: pace, error: null },
      proposals: { status: "ready", data: [proposal], error: null },
    });
    render(<CommercialView />);
    const actions = screen.getByRole("region", { name: "Axi propone" });
    expect(within(actions).queryByRole("button", { name: /Aprobar/ })).toBeNull();
    expect(within(actions).getByText("Tu plan no incluye CRM con IA: el agente no puede trabajar esta lista.")).toBeInTheDocument();
  });

  it("una aprobada sin resultado en esta sesión dice cuándo se aprobó y ofrece «Ver»; con resultado, «Ver qué quedó» (C6)", () => {
    const approved = { ...proposal, id: "a1", status: "approved" as const, decided_at: "2026-09-22T15:00:00.000Z" };
    const here = { ...proposal, id: "a2", title: "Otra", status: "approved" as const, decided_at: "2026-09-23T15:00:00.000Z" };
    useCommercialStore.setState({
      goal: { status: "ready", data: goalResponse, error: null },
      plan: { status: "ready", data: plan, error: null },
      pace: { status: "ready", data: pace, error: null },
      proposals: { status: "ready", data: [approved, here], error: null },
      approvals: { a2: { applied: [], failed: [], status: "approved" } },
    });
    render(<CommercialView />);
    const [first, second] = within(screen.getByRole("region", { name: "Axi propone" })).getAllByRole("listitem");
    expect(first).toHaveTextContent("Se aprobó el 22 de septiembre");
    expect(first).toHaveTextContent(/Ver$/);
    expect(first).not.toHaveTextContent("Ver qué quedó");
    expect(second).toHaveTextContent("Ver qué quedó");
  });

  it("carga una sola vez, solo si la sección está en idle", () => {
    render(<CommercialView />);
    expect(load).toHaveBeenCalledTimes(1);
  });
});
