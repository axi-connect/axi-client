import { act, fireEvent, render, screen } from "@testing-library/react";
import { canOpenCommand, PlatformCommandProvider, usePlatformCommand } from "../PlatformCommand";

const auth = { expired: false, reloginOpen: false };
jest.mock("../../../infrastructure/auth/platform-auth.context", () => ({ usePlatformAuth: () => auth }));
jest.mock("../../../infrastructure/api/hooks/use-tenants", () => ({
  useTenantsQuery: () => ({ data: { data: [], meta: { total: 0 } }, isError: false }),
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
// El Dialog compartido anima con framer-motion; para el test basta el DOM.
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
// cmdk usa ResizeObserver y scrollIntoView, que jsdom no trae.
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => {};
});

function OpenButton() {
  const { setOpen } = usePlatformCommand();
  return (
    <button type="button" onClick={() => setOpen(true)}>
      Abrir buscador
    </button>
  );
}

function setup() {
  return render(
    <PlatformCommandProvider>
      <OpenButton />
    </PlatformCommandProvider>,
  );
}

const ctrlK = () => fireEvent.keyDown(window, { key: "k", ctrlKey: true });
const searchBox = () => screen.queryByRole("combobox", { name: "Buscar en la consola" });

describe("buscador global y re-login", () => {
  beforeEach(() => Object.assign(auth, { expired: false, reloginOpen: false }));

  it("la regla: solo se abre sin re-login de por medio", () => {
    expect(canOpenCommand({ expired: false, reloginOpen: false })).toBe(true);
    expect(canOpenCommand({ expired: true, reloginOpen: true })).toBe(false);
    expect(canOpenCommand({ expired: false, reloginOpen: true })).toBe(false);
  });

  it("con la sesión viva, Ctrl K lo abre", () => {
    setup();
    ctrlK();
    expect(searchBox()).toBeInTheDocument();
  });

  it("con la sesión vencida, ni Ctrl K ni el botón lo abren encima del re-login", () => {
    Object.assign(auth, { expired: true, reloginOpen: true });
    setup();
    ctrlK();
    expect(searchBox()).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Abrir buscador" }));
    expect(searchBox()).not.toBeInTheDocument();
  });

  it("si la sesión vence con el buscador abierto, se cierra", () => {
    const view = setup();
    ctrlK();
    expect(searchBox()).toBeInTheDocument();
    Object.assign(auth, { expired: true, reloginOpen: true });
    act(() => {
      view.rerender(
        <PlatformCommandProvider>
          <OpenButton />
        </PlatformCommandProvider>,
      );
    });
    expect(searchBox()).not.toBeInTheDocument();
  });
});
