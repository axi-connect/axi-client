import { fireEvent, render, screen } from "@testing-library/react";
import { QuickActionFormModal, QUICK_ACTIONS_LIST_HREF } from "../QuickActionFormModal";

const back = jest.fn();
const replace = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ back, replace }) }));
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert: jest.fn() }) }));
jest.mock("@/modules/quick-actions/infrastructure/services/quick-action-service.adapter", () => ({
  getQuickAction: jest.fn(async (id: string) => ({ id, name: "Link de pago" })),
}));
jest.mock("@/modules/quick-actions/ui/forms/QuickActionForm", () => ({
  QuickActionForm: ({ action }: { action?: { name: string } }) => <form id="quick-action-form">{action ? `editando ${action.name}` : "nueva"}</form>,
}));

beforeEach(() => {
  back.mockClear();
  replace.mockClear();
});

describe("QuickActionFormModal — gemelas reales de crear y editar", () => {
  it("editar carga la acción", async () => {
    render(<QuickActionFormModal actionId="qa1" />);
    expect(await screen.findByText("editando Link de pago")).toBeInTheDocument();
  });

  it("por URL directa, cerrar cae a la lista; con historial, vuelve atrás", () => {
    Object.defineProperty(window.history, "length", { configurable: true, value: 1 });
    const { unmount } = render(<QuickActionFormModal />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(replace).toHaveBeenCalledWith(QUICK_ACTIONS_LIST_HREF);
    unmount();
    Object.defineProperty(window.history, "length", { configurable: true, value: 3 });
    render(<QuickActionFormModal />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(back).toHaveBeenCalledTimes(1);
  });
});
