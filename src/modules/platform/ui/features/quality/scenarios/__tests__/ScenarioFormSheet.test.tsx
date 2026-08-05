import { fireEvent, render, screen } from "@testing-library/react";
import type { Scenario } from "../../../../../domain/quality";
import { ScenarioFormSheet } from "../ScenarioFormSheet";

jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn() }),
}));

const createMutateAsync = jest.fn();
const updateMutateAsync = jest.fn();
jest.mock("../../../../../infrastructure/api/hooks/use-quality-scenarios", () => ({
  useCreateScenario: () => ({ mutateAsync: createMutateAsync, isPending: false }),
  useUpdateScenario: () => ({ mutateAsync: updateMutateAsync, isPending: false }),
}));

// El DetailSheet real usa portal + framer-motion; para el form basta el contenido.
jest.mock("@/shared/components/features/detail-sheet", () => ({
  DetailSheet: ({ open, title, children }: { open: boolean; title?: React.ReactNode; children?: React.ReactNode }) =>
    open ? (
      <div>
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

const SCENARIO: Scenario = {
  id: "s-1",
  code: "buyer_multi_product",
  name: "Comprador multiproducto",
  description: null,
  persona: "Eres un cliente impaciente.",
  goal: "Concretar la compra.",
  max_turns: 12,
  tags: [],
  success_criteria: [{ kind: "order_created" }],
  criteria_version: 1,
  is_system: false,
  cloned_from_id: null,
  status: "active",
  created_by: null,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-02T00:00:00Z",
};

describe("ScenarioFormSheet", () => {
  beforeEach(() => jest.clearAllMocks());

  /**
   * Regresión: `defaultValues` se construía en cada render, y `DynamicForm`
   * resetea el formulario cuando cambia la IDENTIDAD de ese objeto. Cualquier
   * re-render del padre (refetch de la lista, cambio de `isPending`) borraba lo
   * editado, criterios incluidos.
   */
  it("un re-render del padre no descarta lo editado en modo edición", () => {
    const { rerender } = render(
      <ScenarioFormSheet open onOpenChange={() => {}} mode="edit" scenario={SCENARIO} />,
    );

    fireEvent.change(screen.getByLabelText(/objetivo/i), { target: { value: "Otro objetivo" } });
    fireEvent.click(screen.getByRole("button", { name: "Añadir criterio" }));
    expect(screen.getByLabelText("Tipo del criterio 2")).toBeInTheDocument();

    // Mismo escenario, objeto de props nuevo: es lo que ocurre en cada refetch.
    rerender(
      <ScenarioFormSheet open onOpenChange={() => {}} mode="edit" scenario={{ ...SCENARIO }} />,
    );

    expect(screen.getByLabelText(/objetivo/i)).toHaveValue("Otro objetivo");
    expect(screen.getByLabelText("Tipo del criterio 2")).toBeInTheDocument();
  });

  it("un escenario distinto sí repuebla el formulario", () => {
    const { rerender } = render(
      <ScenarioFormSheet open onOpenChange={() => {}} mode="edit" scenario={SCENARIO} />,
    );
    fireEvent.change(screen.getByLabelText(/objetivo/i), { target: { value: "Otro objetivo" } });

    rerender(
      <ScenarioFormSheet
        open
        onOpenChange={() => {}}
        mode="edit"
        scenario={{ ...SCENARIO, id: "s-2", goal: "Resolver una duda." }}
      />,
    );

    expect(screen.getByLabelText(/objetivo/i)).toHaveValue("Resolver una duda.");
  });
});
