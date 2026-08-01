import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ContactOwnerSelect } from "../ContactOwnerSelect";
import { clearTenantUsersCache } from "@/modules/crm/infrastructure/services/tenant-users.cache";

const showAlert = jest.fn();
let permissions = ["crm:manage"];

jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal: jest.fn(), closeModal: jest.fn() }),
}));

jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: (p: string) => permissions.includes(p) }),
}));

jest.mock("@/modules/crm/infrastructure/services/contacts-service.adapter", () => ({
  assignContactOwner: jest.fn(),
  listAssignableUsers: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const adapter = require("@/modules/crm/infrastructure/services/contacts-service.adapter") as {
  assignContactOwner: jest.Mock;
  listAssignableUsers: jest.Mock;
};

function user(id: string, name: string, email: string, role = "Operador") {
  return {
    id,
    name,
    email,
    avatar_url: null,
    status: "active" as const,
    role: { id: `r-${id}`, code: "operator", name: role },
  };
}

const USERS = [
  user("u1", "Isabel Pérez", "isabel@megaguay.com.co", "Admin"),
  user("u2", "Carlos Ruiz", "carlos@megaguay.com.co"),
];

function renderSelect(props: Partial<React.ComponentProps<typeof ContactOwnerSelect>> = {}) {
  return render(
    <ContactOwnerSelect contactId="c1" ownerUserId={null} ownerName={null} {...props} />,
  );
}

/** Abre el popover y espera a que la lista haya cargado. */
async function openList() {
  fireEvent.click(screen.getByRole("combobox"));
  await waitFor(() => expect(screen.getByText("Isabel Pérez")).toBeInTheDocument());
}

beforeEach(() => {
  permissions = ["crm:manage"];
  showAlert.mockReset();
  adapter.assignContactOwner.mockReset().mockResolvedValue({});
  adapter.listAssignableUsers.mockReset().mockResolvedValue(USERS);
  clearTenantUsersCache();
});

describe("ContactOwnerSelect", () => {
  it("muestra 'Sin responsable' cuando no hay dueño", () => {
    renderSelect();
    expect(screen.getByText("Sin responsable")).toBeInTheDocument();
  });

  it("muestra el nombre ya resuelto sin esperar a /users", () => {
    renderSelect({ ownerUserId: "u1", ownerName: "Isabel Pérez" });
    expect(screen.getByText("Isabel Pérez")).toBeInTheDocument();
    expect(adapter.listAssignableUsers).not.toHaveBeenCalled();
  });

  it("carga la lista al abrir, no al montar", async () => {
    renderSelect();
    expect(adapter.listAssignableUsers).not.toHaveBeenCalled();

    await openList();
    expect(adapter.listAssignableUsers).toHaveBeenCalledTimes(1);
  });

  it("asigna y refleja el cambio de forma optimista", async () => {
    const onChanged = jest.fn();
    renderSelect({ onChanged });
    await openList();

    fireEvent.click(screen.getByText("Carlos Ruiz"));

    // El trigger ya muestra el destino aunque el PATCH no haya resuelto.
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveTextContent("Carlos Ruiz"));
    expect(adapter.assignContactOwner).toHaveBeenCalledWith("c1", "u2");
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith("u2"));
  });

  it("revierte y avisa si el PATCH falla", async () => {
    adapter.assignContactOwner.mockRejectedValue(new Error("boom"));
    renderSelect({ ownerUserId: "u1", ownerName: "Isabel Pérez" });
    await openList();

    fireEvent.click(screen.getByText("Carlos Ruiz"));

    await waitFor(() => expect(showAlert).toHaveBeenCalled());
    expect(showAlert.mock.calls[0][0]).toMatchObject({ tone: "error" });
    // Rollback al valor anterior, no al destino fallido.
    expect(screen.getByRole("combobox")).toHaveTextContent("Isabel Pérez");
  });

  it("permite quitar el responsable y solo lo ofrece si hay uno", async () => {
    const { unmount } = renderSelect({ ownerUserId: "u1", ownerName: "Isabel Pérez" });
    await openList();
    fireEvent.click(screen.getByText("Quitar responsable"));

    await waitFor(() => expect(adapter.assignContactOwner).toHaveBeenCalledWith("c1", null));
    unmount();

    renderSelect();
    await openList();
    expect(screen.queryByText("Quitar responsable")).not.toBeInTheDocument();
  });

  it("no vuelve a llamar al PATCH si se elige el mismo responsable", async () => {
    renderSelect({ ownerUserId: "u1", ownerName: "Isabel Pérez" });
    fireEvent.click(screen.getByRole("combobox"));
    await waitFor(() => expect(screen.getByText("Carlos Ruiz")).toBeInTheDocument());

    fireEvent.click(screen.getAllByText("Isabel Pérez").at(-1)!);
    expect(adapter.assignContactOwner).not.toHaveBeenCalled();
  });

  it("busca por correo, no solo por nombre", async () => {
    renderSelect();
    await openList();

    fireEvent.change(screen.getByPlaceholderText("Buscar persona…"), {
      target: { value: "carlos@" },
    });

    await waitFor(() => expect(screen.queryByText("Isabel Pérez")).not.toBeInTheDocument());
    expect(screen.getByText("Carlos Ruiz")).toBeInTheDocument();
  });

  it("queda deshabilitado sin crm:manage pero sigue mostrando el responsable", () => {
    permissions = [];
    renderSelect({ ownerUserId: "u1", ownerName: "Isabel Pérez" });

    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByText("Isabel Pérez")).toBeInTheDocument();
  });

  it("comparte la caché de /users entre instancias", async () => {
    const first = renderSelect();
    await openList();
    first.unmount();

    renderSelect();
    await openList();
    expect(adapter.listAssignableUsers).toHaveBeenCalledTimes(1);
  });
});
