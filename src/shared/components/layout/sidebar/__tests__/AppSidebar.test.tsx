import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";

import { AppSidebar } from "../index";
import type { NavigationNodeDTO } from "../types";
import { SidebarProvider } from "../core";

let pathname = "/dashboard";
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => pathname,
}));

// `useLinkStatus` solo existe dentro del árbol de un <Link> real del App
// Router; en jsdom se stubea junto al propio Link.
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: { children: React.ReactNode; href: string } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useLinkStatus: () => ({ pending: false }),
}));

jest.mock("@/shared/auth/auth.hooks", () => ({
  useSession: () => ({
    status: "authenticated",
    user: { name: "Davela", email: "dev@axi.co", avatar_url: null, role: { name: "Owner" } },
  }),
}));

/** Constructor breve de nodos del DTO. */
function dto(
  code: string,
  path: string | null,
  sort_order: number,
  children: NavigationNodeDTO[] = [],
): NavigationNodeDTO {
  return { id: `id-${code}`, code, name: code, icon: null, path, sort_order, children };
}

/**
 * Árbol de 3 niveles equivalente al del seed:
 *   crm (/crm) → contacts (/contacts)
 *   settings (grupo) → security (grupo) → users, roles
 */
const NAVIGATION: NavigationNodeDTO[] = [
  dto("dashboard", "/dashboard", 10),
  dto("crm", "/crm", 20, [dto("contacts", "/contacts", 10)]),
  dto("settings", null, 30, [
    dto("security", null, 10, [dto("users", "/settings/users", 10), dto("roles", "/settings/roles", 20)]),
  ]),
];

function renderSidebar(openCodes: string[] = []) {
  return render(
    <SidebarProvider>
      <AppSidebar initialItems={NAVIGATION} defaultOpenCodes={openCodes} />
    </SidebarProvider>,
  );
}

describe("AppSidebar — navegación jerárquica", () => {
  beforeEach(() => {
    pathname = "/dashboard";
    document.cookie = "sidebar_nav_open=; path=/; max-age=0";
  });

  it("con árbol precargado pinta el menú sin skeleton", () => {
    renderSidebar();

    expect(screen.getByRole("link", { name: "dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByLabelText("Cargando menú")).not.toBeInTheDocument();
  });

  it("los grupos arrancan plegados: los hijos no están en el DOM", () => {
    renderSidebar();

    expect(screen.queryByRole("link", { name: "contacts" })).not.toBeInTheDocument();
  });

  it("el chevron despliega el grupo SIN navegar", () => {
    renderSidebar();

    // La fila de CRM sigue siendo un link a /crm...
    expect(screen.getByRole("link", { name: "crm" })).toHaveAttribute("href", "/crm");
    // ...y el chevron es un target aparte.
    const chevron = screen.getByRole("button", { name: "Expandir crm" });
    expect(chevron).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(chevron);

    expect(screen.getByRole("link", { name: "contacts" })).toHaveAttribute("href", "/crm/contacts");
    expect(screen.getByRole("button", { name: "Contraer crm" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("un grupo puro no genera link: la fila entera es el toggle", () => {
    renderSidebar();

    expect(screen.queryByRole("link", { name: "settings" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("settings"));
    expect(screen.getByText("security")).toBeInTheDocument();
  });

  it("abre sola la rama de la ruta activa, aunque no esté en la cookie", async () => {
    pathname = "/settings/roles";
    renderSidebar();

    // settings → security → roles se despliegan sin intervención.
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "roles" })).toBeInTheDocument();
    });
    const active = screen.getByRole("link", { name: "roles" });
    expect(active).toHaveAttribute("aria-current", "page");
    // El hermano de la misma rama también es visible, pero no es el activo.
    expect(screen.getByRole("link", { name: "users" })).not.toHaveAttribute("aria-current");
  });

  it("marca activo el ítem más específico en una ruta profunda", async () => {
    pathname = "/crm/contacts/abc-123";
    renderSidebar();

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "contacts" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });
    // El ancestro NO se marca como página actual.
    expect(screen.getByRole("link", { name: "crm" })).not.toHaveAttribute("aria-current");
  });

  it("respeta los grupos abiertos que llegan de la cookie", () => {
    renderSidebar(["crm"]);

    expect(screen.getByRole("link", { name: "contacts" })).toBeInTheDocument();
  });

  it("persiste en la cookie los grupos abiertos, y solo ellos", () => {
    // El pathname es /dashboard, una hoja: no debe acabar en la cookie (si no,
    // crecería con un código por cada página visitada).
    renderSidebar();

    fireEvent.click(screen.getByRole("button", { name: "Expandir crm" }));

    expect(document.cookie).toContain("sidebar_nav_open=crm");
    expect(document.cookie).not.toContain("dashboard");
  });

  it("al plegar retira el grupo de la cookie", () => {
    renderSidebar(["crm"]);

    fireEvent.click(screen.getByRole("button", { name: "Contraer crm" }));

    // Se asserta el estado semántico, no el desmontaje: `AnimatePresence`
    // mantiene el submenú montado mientras corre la animación de salida, y en
    // jsdom framer-motion no la completa de forma fiable.
    expect(screen.getByRole("button", { name: "Expandir crm" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(document.cookie).not.toContain("crm");
  });
});

describe("AppSidebar — carga y error", () => {
  beforeEach(() => {
    pathname = "/dashboard";
  });

  it("sin árbol precargado hace fetch y ofrece reintento si falla", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>,
    );

    const retry = await screen.findByRole("button", { name: "Reintentar" });
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/sidebar", { cache: "no-store" });

    // El reintento vuelve a pedir el menú, ahora con éxito.
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve(NAVIGATION) });
    fireEvent.click(retry);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "dashboard" })).toBeInTheDocument();
    });
  });

  it("el menú precargado no dispara fetch del cliente", () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    renderSidebar();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("AppSidebar — colapso a modo icono", () => {
  beforeEach(() => {
    pathname = "/dashboard";
    document.cookie = "sidebar_state=; path=/; max-age=0";
  });

  const collapseButton = () => screen.getByRole("button", { name: /^(Colapsar|Expandir) menú$/ });

  it("la cabecera ofrece un control de colapso etiquetado", () => {
    // El modo icono existía desde el principio, pero sólo se activaba desde un
    // botón sin etiqueta del header de página, el atajo de teclado o una franja
    // de 4px. Ninguno se ve.
    renderSidebar();

    expect(collapseButton()).toHaveAccessibleName("Colapsar menú");
  });

  it("alterna el estado y cambia su etiqueta a la acción inversa", () => {
    renderSidebar();

    fireEvent.click(collapseButton());
    // Colapsado el botón sigue presente: es el único camino de vuelta, porque
    // los subniveles del menú se ocultan por CSS en modo icono.
    expect(collapseButton()).toHaveAccessibleName("Expandir menú");

    fireEvent.click(collapseButton());
    expect(collapseButton()).toHaveAccessibleName("Colapsar menú");
  });

  it("persiste el colapso en la cookie que lee el layout server", () => {
    // Sin esto el colapso no sobrevive a una recarga: `(private)/layout.tsx`
    // arranca el SidebarProvider con `defaultOpen` leído de esta cookie.
    renderSidebar();

    fireEvent.click(collapseButton());

    expect(document.cookie).toContain("sidebar_state=false");
  });

  it("en modo icono el tema sigue siendo accesible", () => {
    // Antes el segmentado de tres opciones se ocultaba al colapsar y no había
    // forma de cambiar el tema sin volver a expandir el menú.
    renderSidebar();
    expect(screen.getByRole("radiogroup", { name: "Tema de la interfaz" })).toBeInTheDocument();

    fireEvent.click(collapseButton());

    const trigger = screen.getByRole("button", { name: /^Tema de la interfaz:/ });
    fireEvent.click(trigger);

    // Las tres opciones siguen ofreciéndose, no se degrada a un botón cíclico.
    expect(screen.getByRole("radio", { name: "Tema claro" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Tema del sistema" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Tema oscuro" })).toBeInTheDocument();
  });
});

describe("AppSidebar — geometría del chevron", () => {
  beforeEach(() => {
    pathname = "/dashboard";
  });

  /** El `<li>` que contiene una fila, que es también su contenedor de posición. */
  const rowItem = (el: HTMLElement) => el.closest("li") as HTMLElement;

  it("el chevron NO comparte caja posicionada con el submenú", () => {
    // Este es el invariante que falló: el chevron es `absolute top-1/2`, así que
    // si su contenedor de posición incluye el submenú, la flecha se coloca en la
    // mitad de (fila + hijos) y se sale de su propia fila al desplegar.
    // jsdom no calcula layout, así que se asserta la estructura que lo causaba.
    renderSidebar(["crm"]);

    const chevron = screen.getByRole("button", { name: "Contraer crm" });
    const sub = document.getElementById(chevron.getAttribute("aria-controls") as string);
    expect(sub).not.toBeNull();
    expect(chevron.parentElement?.contains(sub as HTMLElement)).toBe(false);
  });

  it("una hoja dentro de un grupo abierto no tiene ningún chevron", () => {
    renderSidebar(["crm"]);

    const leaf = rowItem(screen.getByRole("link", { name: "contacts" }));
    expect(within(leaf).queryAllByTestId("nav-chevron")).toHaveLength(0);
  });

  it("cada grupo pinta exactamente un chevron, en su propia fila", () => {
    // settings (grupo puro) → security (grupo puro) → users, roles.
    // Con los dos abiertos, el <li> de settings contiene el de security: contar
    // sobre el <li> delataría la flecha del padre colándose en el hijo.
    renderSidebar(["settings", "security"]);

    const securityRow = screen.getByText("security");
    const securityItem = rowItem(securityRow);

    // La caja de la fila de security tiene su flecha y solo la suya.
    expect(within(securityRow.closest("div.relative") as HTMLElement).getAllByTestId("nav-chevron"))
      .toHaveLength(1);
    // Y la flecha de settings no vive dentro del <li> de security.
    const settingsChevron = within(rowItem(screen.getByText("settings")))
      .getAllByTestId("nav-chevron")
      .find((node) => !securityItem.contains(node));
    expect(settingsChevron).toBeDefined();
  });

  it("un grupo puro anuncia su estado de plegado en la propia fila", () => {
    // No hay chevron interactivo que lo declare (la flecha es decorativa), así
    // que sin esto un lector de pantalla no sabría que la fila es plegable.
    renderSidebar();

    const row = screen.getByText("settings").closest("[aria-expanded]") as HTMLElement;
    expect(row).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(row);

    expect(row).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(row.getAttribute("aria-controls") as string)).not.toBeNull();
  });
});

describe("AppSidebar — accesibilidad del árbol", () => {
  beforeEach(() => {
    pathname = "/dashboard";
  });

  it("el chevron declara aria-expanded y controla el submenú", () => {
    renderSidebar();

    const chevron = screen.getByRole("button", { name: "Expandir crm" });
    const controls = chevron.getAttribute("aria-controls");
    expect(controls).toBeTruthy();

    fireEvent.click(chevron);

    const sub = document.getElementById(controls as string);
    expect(sub).not.toBeNull();
    expect(within(sub as HTMLElement).getByRole("link", { name: "contacts" })).toBeInTheDocument();
  });
});
