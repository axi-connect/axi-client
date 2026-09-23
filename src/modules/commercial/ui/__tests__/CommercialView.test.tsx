import { cleanup, render, screen } from "@testing-library/react";
import { resetCommercialStore, useCommercialStore } from "@/modules/commercial/infrastructure/stores/commercial.store";
import { CommercialView } from "../CommercialView";
import { goalResponse, pace, plan } from "./fixtures";

const mockEntitlements = jest.fn(() => ({ entitlements: null, loaded: true, hasCapability: () => true }));
jest.mock("@/shared/auth/entitlements.hooks", () => ({ useEntitlements: () => mockEntitlements() }));
const permissions = new Set(["commercial:read", "commercial:manage"]);
jest.mock("@/shared/auth/auth.hooks", () => ({ useAuth: () => ({ hasPermission: (code: string) => permissions.has(code) }) }));
jest.mock("framer-motion", () => ({ useReducedMotion: () => true, animate: () => ({ stop: () => {} }) }));

const load = jest.fn().mockResolvedValue(undefined);

afterEach(cleanup);
beforeEach(() => {
  resetCommercialStore();
  load.mockClear();
  permissions.add("commercial:read");
  mockEntitlements.mockReturnValue({ entitlements: null, loaded: true, hasCapability: () => true });
  useCommercialStore.setState({ load });
});

describe("CommercialView", () => {
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

  it("con meta: cabecera con procedencia, hero, ritmo, resultados y «Axi propone» vacío", () => {
    useCommercialStore.setState({
      goal: { status: "ready", data: goalResponse, error: null },
      plan: { status: "ready", data: plan, error: null },
      pace: { status: "ready", data: pace, error: null },
    });
    render(<CommercialView />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Tu ruta de septiembre");
    expect(screen.getByText(/Meta del mes: .*30\.000\.000.*la pusiste tú el 1 sep/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /cambiar meta/i })).toHaveAttribute("href", "/comercial/meta");
    expect(screen.getByRole("region", { name: "La ruta del mes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Resultados clave" })).toBeInTheDocument();
    expect(screen.getByText("Estás al día. Cuando algo pueda acelerar la ruta, aquí lo verás.")).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });
});
