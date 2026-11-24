import { render, screen } from "@testing-library/react";
import { SidebarProvider } from "@/shared/components/layout/sidebar/core";
import { PlatformSidebar } from "../PlatformSidebar";

jest.mock("next/navigation", () => ({ usePathname: () => "/platform" }));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useLinkStatus: () => ({ pending: false }),
}));
jest.mock("../../../infrastructure/auth/platform-auth.context", () => ({
  usePlatformAuth: () => ({ session: { email: "laura@axi.dev", expiresAt: Date.now() + 600_000 }, logout: jest.fn() }),
}));
jest.mock("../../../infrastructure/hooks/use-session-countdown", () => ({
  useSessionCountdown: () => ({ mmss: "10:00", msLeft: 600_000, warning: false }),
}));
jest.mock("../../../infrastructure/api/hooks/use-tenants", () => ({
  useTenantsQuery: () => ({ data: { data: [], meta: { total: 23 } } }),
}));
jest.mock("../../../infrastructure/api/hooks/use-analytics", () => ({ useTriggeredAlertsCount: () => ({ data: 3 }) }));
jest.mock("../../../infrastructure/api/hooks/use-intake", () => ({ useIntakeSessionsQuery: () => ({ data: { data: [] } }) }));
jest.mock("../PlatformCommand", () => ({ usePlatformCommand: () => ({ open: false, setOpen: jest.fn() }) }));

function setup(userAgent = "Mozilla/5.0 (X11; Linux x86_64)") {
  Object.defineProperty(window.navigator, "userAgent", { value: userAgent, configurable: true });
  Object.defineProperty(window, "innerWidth", { value: 1440, configurable: true });
  render(
    <SidebarProvider>
      <PlatformSidebar />
    </SidebarProvider>,
  );
}

describe("barra lateral: accesibilidad de contadores y atajo", () => {
  it("el contador se oye como frase, no pegado al nombre («Empresas23»)", () => {
    setup();
    expect(screen.getByRole("link", { name: /^Empresas\s?, 23 empresas$/ })).toHaveAttribute("href", "/platform/tenants");
    expect(screen.getByRole("link", { name: /^Analytics\s?, 3 alertas disparadas$/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Empresas23/ })).not.toBeInTheDocument();
  });

  it("el atajo dice Ctrl K fuera de Mac y ⌘K en Mac", () => {
    setup();
    expect(screen.getByText("Ctrl K")).toBeInTheDocument();
  });

  it("en Mac muestra ⌘K", () => {
    setup("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)");
    expect(screen.getByText("⌘K")).toBeInTheDocument();
  });
});
