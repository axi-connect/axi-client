import { fireEvent, render, screen } from "@testing-library/react";
import { CreateDealModal } from "../CreateDealModal";

const back = jest.fn();
const replace = jest.fn();
let params = new URLSearchParams();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ back, replace }),
  useSearchParams: () => params,
}));
let lastPreset: unknown = null;
let finish: ((id: string) => void) | null = null;
jest.mock("@/modules/crm/ui/forms/DealForm", () => ({
  DealForm: ({ presetContact, onSuccess }: { presetContact?: unknown; onSuccess: (id: string) => void }) => {
    lastPreset = presetContact ?? null;
    finish = onSuccess;
    return <form id="crm-deal-form" />;
  },
}));

beforeEach(() => {
  back.mockClear();
  replace.mockClear();
  params = new URLSearchParams();
  lastPreset = null;
});

describe("CreateDealModal — la ruta real y la interceptada (QA DQ-H2)", () => {
  it("precarga el contacto que llega del 360 por ?contact_id&contact_label", () => {
    params = new URLSearchParams({ contact_id: "k1", contact_label: "Laura Gómez" });
    render(<CreateDealModal />);
    expect(lastPreset).toEqual({ id: "k1", label: "Laura Gómez" });
  });

  it("Cancelar vuelve atrás cuando hay de dónde (el 360 o el board)", () => {
    Object.defineProperty(window.history, "length", { configurable: true, value: 3 });
    render(<CreateDealModal />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(back).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it("abierto por URL directa (sin historial), Cancelar cae al board", () => {
    Object.defineProperty(window.history, "length", { configurable: true, value: 1 });
    render(<CreateDealModal />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(replace).toHaveBeenCalledWith("/crm/pipeline");
  });

  it("al crear, lleva al deal nuevo", () => {
    render(<CreateDealModal />);
    finish?.("d9");
    expect(replace).toHaveBeenCalledWith("/crm/pipeline/deal/d9");
  });
});
