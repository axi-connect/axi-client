import { fireEvent, render, screen, within } from "@testing-library/react";
import type { SuiteListItem } from "../../../../../domain/quality";
import { SuiteScenariosSheet } from "../SuiteScenariosSheet";

const showModal = jest.fn();
const closeModal = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn(), showModal, closeModal }),
}));

const suiteDetail = jest.fn();
const scenariosPage = jest.fn();
const setMutateAsync = jest.fn();

jest.mock("../../../../../infrastructure/api/hooks/use-quality-suites", () => ({
  useSuiteQuery: () => suiteDetail(),
  useSetSuiteScenarios: () => ({ mutateAsync: setMutateAsync, isPending: false }),
}));
jest.mock("../../../../../infrastructure/api/hooks/use-quality-scenarios", () => ({
  useScenariosQuery: () => scenariosPage(),
}));

/**
 * El `DetailSheet` real usa portal + framer-motion. El doble mantiene la
 * distinción que importa para estas pruebas: el cuerpo scrollea, el footer NO
 * (es un hermano fuera del scroller).
 */
jest.mock("@/shared/components/features/detail-sheet", () => ({
  DetailSheet: ({
    open,
    title,
    children,
    renderFooter,
  }: {
    open: boolean;
    title?: React.ReactNode;
    children?: React.ReactNode;
    renderFooter?: () => React.ReactNode;
  }) =>
    open ? (
      <div>
        <h2>{title}</h2>
        <div data-testid="sheet-body">{children}</div>
        {renderFooter ? <div data-testid="sheet-footer">{renderFooter()}</div> : null}
      </div>
    ) : null,
}));

const SUITE = {
  id: "suite-1",
  code: "crm_handoff",
  name: "CRM y handoff",
  description: null,
  is_system: false,
  status: "active",
  scenarios_count: 2,
  created_by: null,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-02T00:00:00Z",
} as SuiteListItem;

const LONG_NAME =
  "CRM: interesado que no cierra hoy y acepta seguimiento por WhatsApp con recordatorio a los tres días";

function scenario(id: string, code: string, name: string, status = "active") {
  return { id, code, name, status };
}

function detail(scenarios: { id: string; code: string; name: string; status: string }[]) {
  return {
    isPending: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    data: { scenarios: scenarios.map((s, i) => ({ position: i + 1, scenario: s })) },
  };
}

function picker(rows: { id: string; code: string; name: string; status: string }[], total = rows.length) {
  return { isPending: false, data: { data: rows, meta: { total, page: 1, page_size: 10 } } };
}

describe("SuiteScenariosSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    suiteDetail.mockReturnValue(detail([scenario("s-1", "crm_lead_no_close", LONG_NAME)]));
    scenariosPage.mockReturnValue(picker([scenario("s-2", "robust_off_topic_scope", "Robusteza fuera de alcance")]));
  });

  /**
   * Regresión del bug de render: el nombre iba en un `<span>` inline, donde
   * `truncate` es inerte, así que desbordaba y se pintaba encima de los botones
   * ↑ ↓ ✕ y del botón «Añadir». El nombre debe ser un elemento de BLOQUE
   * truncable dentro de una caja `min-w-0 overflow-hidden`.
   */
  it("el nombre del escenario se trunca en un bloque acotado, no desborda sobre las acciones", () => {
    render(<SuiteScenariosSheet open onOpenChange={() => {}} suite={SUITE} />);

    const name = screen.getAllByTitle(LONG_NAME)[0];
    expect(name.tagName).toBe("P");
    expect(name).toHaveClass("truncate");
    expect(name.parentElement).toHaveClass("min-w-0", "overflow-hidden");
  });

  it("las acciones de guardado viven en el footer del sheet, fuera del cuerpo scrolleable", () => {
    render(<SuiteScenariosSheet open onOpenChange={() => {}} suite={SUITE} />);

    const footer = screen.getByTestId("sheet-footer");
    expect(within(footer).getByRole("button", { name: "Guardar composición" })).toBeInTheDocument();
    expect(
      within(screen.getByTestId("sheet-body")).queryByRole("button", { name: "Guardar composición" }),
    ).not.toBeInTheDocument();
  });

  it("el estado del footer explica por qué no se puede guardar todavía", () => {
    render(<SuiteScenariosSheet open onOpenChange={() => {}} suite={SUITE} />);

    expect(screen.getByText("1 de 50 · sin cambios")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar composición" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Añadir robust_off_topic_scope" }));

    expect(screen.getByText("2 de 50 · cambios sin guardar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar composición" })).toBeEnabled();
  });

  it("cerrar con cambios sin guardar pide confirmación y no cierra por su cuenta", () => {
    const onOpenChange = jest.fn();
    render(<SuiteScenariosSheet open onOpenChange={onOpenChange} suite={SUITE} />);

    fireEvent.click(screen.getByRole("button", { name: "Añadir robust_off_topic_scope" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(showModal).toHaveBeenCalledTimes(1);

    const config = showModal.mock.calls[0][0];
    expect(config.title).toBe("¿Descartar los cambios?");
    config.actions.find((a: { id: string }) => a.id === "suite-scenarios-discard-confirm").onClick();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("sin cambios, cerrar no molesta con una confirmación", () => {
    const onOpenChange = jest.fn();
    render(<SuiteScenariosSheet open onOpenChange={onOpenChange} suite={SUITE} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(showModal).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  /** Un botón deshabilitado no dice nada: lo ya incluido se anuncia como texto. */
  it("un escenario ya incluido muestra «En la suite» en vez de un botón muerto", () => {
    scenariosPage.mockReturnValue(picker([scenario("s-1", "crm_lead_no_close", LONG_NAME)]));
    render(<SuiteScenariosSheet open onOpenChange={() => {}} suite={SUITE} />);

    expect(screen.getByText("En la suite")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Añadir crm_lead_no_close" })).not.toBeInTheDocument();
  });

  it("al tope de 50 explica el motivo en vez de deshabilitar botones en silencio", () => {
    suiteDetail.mockReturnValue(
      detail(Array.from({ length: 50 }, (_, i) => scenario(`full-${i}`, `code_${i}`, `Escenario ${i}`))),
    );
    render(<SuiteScenariosSheet open onOpenChange={() => {}} suite={SUITE} />);

    expect(screen.getByText(/Llegaste al tope de 50 escenarios por suite/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Añadir robust_off_topic_scope" })).toBeDisabled();
  });

  /** El tope de 10 resultados del picker no puede ser silencioso. */
  it("avisa cuando hay más escenarios de los que muestra", () => {
    scenariosPage.mockReturnValue(
      picker([scenario("s-2", "robust_off_topic_scope", "Robusteza fuera de alcance")], 37),
    );
    render(<SuiteScenariosSheet open onOpenChange={() => {}} suite={SUITE} />);

    expect(screen.getByText("Mostrando 1 de 37. Refina la búsqueda para ver el resto.")).toBeInTheDocument();
  });

  it("reordena con las flechas manteniendo la secuencia de ejecución", () => {
    suiteDetail.mockReturnValue(
      detail([
        scenario("s-1", "aaa", "Primero"),
        scenario("s-2", "bbb", "Segundo"),
        scenario("s-3", "ccc", "Tercero"),
      ]),
    );
    render(<SuiteScenariosSheet open onOpenChange={() => {}} suite={SUITE} />);

    fireEvent.click(screen.getByRole("button", { name: "Bajar aaa" }));

    const codes = screen
      .getByRole("list", { name: "Escenarios en orden de ejecución" })
      .querySelectorAll("li p.font-mono");
    expect(Array.from(codes).map((n) => n.textContent)).toEqual(["bbb", "aaa", "ccc"]);
  });

  it("una suite de sistema no ofrece ni reordenar ni guardar", () => {
    render(<SuiteScenariosSheet open onOpenChange={() => {}} suite={SUITE} readOnly />);

    expect(screen.queryByTestId("sheet-footer")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reordenar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Quitar/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Buscar escenarios para añadir")).not.toBeInTheDocument();
  });

  it("un escenario archivado se marca y explica su consecuencia", () => {
    suiteDetail.mockReturnValue(
      detail([scenario("s-1", "crm_lead_no_close", LONG_NAME, "archived")]),
    );
    render(<SuiteScenariosSheet open onOpenChange={() => {}} suite={SUITE} />);

    expect(screen.getByText("Archivado")).toBeInTheDocument();
    expect(screen.getByText(/1 escenario archivado no se ejecutará\./)).toBeInTheDocument();
    expect(
      screen.getByText(/tendrá menos casos que escenarios listados/),
    ).toBeInTheDocument();
  });
});
