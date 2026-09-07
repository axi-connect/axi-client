import { render, screen } from "@testing-library/react";

const listBranches = jest.fn();
jest.mock("@/modules/companies/infrastructure/services/branches-service.adapter", () => ({
  listBranches: () => listBranches(),
  deleteBranch: jest.fn(),
  createBranch: jest.fn(),
  updateBranch: jest.fn(),
  replaceBranchSchedules: jest.fn(),
}));
const useMyCompany = jest.fn();
jest.mock("@/modules/companies/infrastructure/hooks/use-my-company", () => ({
  useMyCompany: () => useMyCompany(),
}));
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn(), showModal: jest.fn(), closeModal: jest.fn() }),
}));
jest.mock("@/modules/companies/ui/components/branches/BranchFormSheet", () => ({
  BranchFormSheet: () => null,
}));

import { BranchesTab } from "@/modules/companies/ui/components/branches/BranchesTab";

const branch = (over: Record<string, unknown>) => ({
  id: "x",
  name: "X",
  address: "Cl 1",
  city: "Bogotá",
  country_code: "CO",
  latitude: 4.6,
  longitude: -74.07,
  directions: null,
  is_main: false,
  is_active: true,
  position: 0,
  schedules: [],
  created_at: "",
  updated_at: "",
  ...over,
});

describe("BranchesTab", () => {
  it("vacío con dirección general: ofrece crear la sede principal desde la empresa", async () => {
    useMyCompany.mockReturnValue({ company: { address: "Av 68", city: "Bogotá", country_code: "CO" } });
    listBranches.mockResolvedValue({ data: [], meta: { total: 0 } });
    render(<BranchesTab />);
    expect(await screen.findByText("Aún no hay sucursales")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /desde la dirección de la empresa/ })).toBeInTheDocument();
  });

  it("lista: principal primero, indicaciones y origen del horario (propio vs empresa)", async () => {
    useMyCompany.mockReturnValue({ company: { address: null, city: null, country_code: "CO" } });
    listBranches.mockResolvedValue({
      data: [
        branch({ id: "b", name: "Usaquén", position: 1, schedules: [{ id: "s", weekday: 6, opens_at: "10:00", closes_at: "14:00" }] }),
        branch({ id: "a", name: "Centro", is_main: true, position: 5, directions: "Al frente del parque" }),
      ],
      meta: { total: 2 },
    });
    render(<BranchesTab />);
    const cards = await screen.findAllByRole("article");
    expect(cards[0]).toHaveAccessibleName("Centro");
    expect(screen.getByText("Principal")).toBeInTheDocument();
    expect(screen.getByText("Al frente del parque")).toBeInTheDocument();
    expect(screen.getByText("Horario propio")).toBeInTheDocument();
    expect(screen.getByText("Horario de la empresa")).toBeInTheDocument();
  });
});
