import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ContactFormModal, CONTACTS_LIST_HREF } from "../ContactFormModal";

const back = jest.fn();
const replace = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ back, replace }) }));
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert: jest.fn() }) }));
jest.mock("@/modules/crm/infrastructure/services/contacts-service.adapter", () => ({
  getContact: jest.fn(async (id: string) => ({ id, full_name: "Laura Gómez", phone: null, email: null })),
}));
let save: (() => void) | null = null;
jest.mock("@/modules/crm/ui/forms/ContactForm", () => ({
  ContactForm: ({ contact, onSuccess }: { contact?: { full_name: string }; onSuccess: () => void }) => {
    save = onSuccess;
    return <form id="crm-contact-form">{contact ? `editando ${contact.full_name}` : "nuevo"}</form>;
  },
}));

const withHistory = (length: number) => Object.defineProperty(window.history, "length", { configurable: true, value: length });

beforeEach(() => {
  back.mockClear();
  replace.mockClear();
  save = null;
});

describe("ContactFormModal — gemelas reales de crear y editar contacto", () => {
  it("editar: carga el contacto y precarga el formulario", async () => {
    render(<ContactFormModal contactId="k1" />);
    expect(await screen.findByText("editando Laura Gómez")).toBeInTheDocument();
  });

  it("cerrar con historial vuelve atrás; por URL directa, a la lista", () => {
    withHistory(4);
    const { unmount } = render(<ContactFormModal />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(back).toHaveBeenCalledTimes(1);
    unmount();

    withHistory(1);
    render(<ContactFormModal />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(replace).toHaveBeenCalledWith(CONTACTS_LIST_HREF);
  });

  it("guardar sin historial cae a la lista (y avisa a la tabla)", async () => {
    withHistory(1);
    const saved = jest.fn();
    window.addEventListener("crm:contacts:save:success", saved);
    render(<ContactFormModal contactId="k1" />);
    await waitFor(() => expect(save).not.toBeNull());
    act(() => save?.());
    expect(saved).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/crm/contacts");
  });
});
