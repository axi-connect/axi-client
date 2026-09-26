import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { expectAlertContract } from "@/core/notifications/testing";

const mockNote = jest.fn<Promise<unknown>, [string, string]>();
jest.mock(
  "@/modules/collections/infrastructure/services/collections-service.adapter",
  () => ({
    addPlanNote: (planId: string, note: string) => mockNote(planId, note),
  }),
);
const mockShowAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: mockShowAlert }),
}));

import { PlanNoteDialog } from "@/modules/collections/ui/components/PlanNoteDialog";

describe("PlanNoteDialog: una pregunta, para el equipo", () => {
  beforeEach(() => jest.clearAllMocks());

  it("parte de la nota vigente, no guarda si no cambió, y al cambiar hace PATCH y avisa según §9.4", async () => {
    mockNote.mockResolvedValue({ plan_id: "plan-1" });
    const onDone = jest.fn();
    render(
      <PlanNoteDialog
        open
        planId="plan-1"
        current="Cobra el 20"
        onOpenChange={jest.fn()}
        onDone={onDone}
      />,
    );
    // El diálogo también se llama «Nota del plan» (su título): el campo es el textbox
    const field = screen.getByRole("textbox", { name: "Nota del plan" });
    expect(field).toHaveValue("Cobra el 20");
    expect(screen.getByRole("button", { name: "Guardar nota" })).toBeDisabled();
    fireEvent.change(field, {
      target: { value: "Cobra el 20; llamar antes de escribir" },
    });
    expect(screen.getByText("37 / 1000")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Guardar nota" }));
    await waitFor(() =>
      expect(mockNote).toHaveBeenCalledWith(
        "plan-1",
        "Cobra el 20; llamar antes de escribir",
      ),
    );
    expect(onDone).toHaveBeenCalled();
    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.objectContaining({ tone: "success", title: "Nota guardada" }),
    );
    expectAlertContract(mockShowAlert.mock.calls[0]?.[0]);
  });

  it("sin nota vigente empieza vacío y el vacío no se guarda", () => {
    render(
      <PlanNoteDialog
        open
        planId="plan-1"
        current={null}
        onOpenChange={jest.fn()}
      />,
    );
    const field = screen.getByRole("textbox", { name: "Nota del plan" });
    expect(field).toHaveValue("");
    fireEvent.change(field, {
      target: { value: "   " },
    });
    expect(screen.getByRole("button", { name: "Guardar nota" })).toBeDisabled();
  });
});
