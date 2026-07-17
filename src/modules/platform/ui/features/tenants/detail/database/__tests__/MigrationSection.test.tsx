import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { TenantDatabaseView } from "../../../../../../domain/database";
import { MigrationSection } from "../MigrationSection";

jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn() }),
}));

const planTier = { current: "sbs" as "sbs" | "enterprise" };
jest.mock("../../../../../../infrastructure/api/hooks/use-tenant-plan", () => ({
  useTenantPlanQuery: () => ({
    data: { plan: { tier: planTier.current }, subscription_status: "active", billing_cycle_anchor: null, limits: [] },
    isPending: false,
  }),
}));

const migrations = { current: [] as unknown[] };
const startMutateAsync = jest.fn();
jest.mock("../../../../../../infrastructure/api/hooks/use-tenant-migrations", () => {
  const actual = jest.requireActual("../../../../../../infrastructure/api/hooks/use-tenant-migrations");
  return {
    latestMigration: actual.latestMigration,
    useMigrationsQuery: () => ({ data: { data: migrations.current }, isPending: false }),
    useStartDataMigration: () => ({ mutateAsync: startMutateAsync, isPending: false }),
  };
});

// El ConfirmTyped usa el Dialog compartido (framer-motion): mock de animaciones.
jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy({}, {
    get: (_t, tag: string) => {
      const Component = ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
        const dom = Object.fromEntries(Object.entries(props).filter(([k]) => !["initial", "animate", "exit", "transition", "onWheelCapture", "onTouchMoveCapture"].includes(k)));
        const Tag = tag as keyof React.JSX.IntrinsicElements;
        return <Tag {...dom}>{children}</Tag>;
      };
      Component.displayName = `motion.${tag}`;
      return Component;
    },
  }),
}));

const DB: TenantDatabaseView = {
  id: "d-1",
  company_id: "t-1",
  host: "db.acme.internal",
  port: 5432,
  database_name: "acme_prod",
  username: "axi_app",
  ssl_mode: "require",
  pool_max: 10,
  status: "active",
  last_validated_at: "2026-07-17T10:00:00Z",
  provisioned_at: "2026-07-16T10:00:00Z",
  migration_version: "20260716120000",
  last_error: null,
  credentials_configured: true,
  created_at: "2026-07-15T10:00:00Z",
  updated_at: "2026-07-16T10:00:00Z",
};

describe("MigrationSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    planTier.current = "sbs";
    migrations.current = [];
  });

  it("con precondición en ✘ (plan enterprise) el botón queda deshabilitado", () => {
    planTier.current = "enterprise";
    render(<MigrationSection tenantId="t-1" tenantName="Acme Corp" database={DB} />);

    expect(screen.getByRole("button", { name: /migrar datos…/i })).toBeDisabled();
    expect(screen.getByText(/ya opera en enterprise/i)).toBeInTheDocument();
  });

  it("con todo ✔, exige escribir el nombre del tenant y dispara la migración", async () => {
    startMutateAsync.mockResolvedValueOnce({ migration_id: "m-1", job_id: "j-1" });
    render(<MigrationSection tenantId="t-1" tenantName="Acme Corp" database={DB} />);

    fireEvent.click(screen.getByRole("button", { name: /migrar datos…/i }));
    // ConfirmTyped reforzado: aviso de ventana de mantenimiento visible.
    expect(screen.getByText(/ventana de mantenimiento/i)).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Migrar datos" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/para confirmar/i), { target: { value: "Acme Corp" } });

    // Se re-consulta: el subárbol del diálogo puede re-montarse al re-render.
    const confirmAction = await screen.findByRole("button", { name: "Migrar datos" });
    await waitFor(() => expect(confirmAction).toBeEnabled());

    fireEvent.click(confirmAction);
    await waitFor(() => expect(startMutateAsync).toHaveBeenCalledTimes(1));
  });

  it("con una migración en vuelo muestra el progreso y no el botón", () => {
    migrations.current = [
      {
        id: "m-2",
        company_id: "t-1",
        status: "copying",
        progress: { copied: { messages: 89_120 } },
        stats: null,
        error: null,
        started_at: "2026-07-17T11:00:00Z",
        finished_at: null,
        created_at: "2026-07-17T11:00:00Z",
      },
    ];
    render(<MigrationSection tenantId="t-1" tenantName="Acme Corp" database={DB} />);

    expect(screen.queryByRole("button", { name: /migrar datos…/i })).not.toBeInTheDocument();
    expect(screen.getByText("messages")).toBeInTheDocument();
    expect(screen.getByText(/puedes salir de esta vista/i)).toBeInTheDocument();
  });
});
