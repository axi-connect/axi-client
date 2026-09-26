import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ContactsSummary } from "../ContactsSummary";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const getContactStats = jest.fn();
const listDuplicates = jest.fn();
jest.mock("@/modules/crm/infrastructure/services/contacts-service.adapter", () => ({
  getContactStats: (...args: unknown[]) => getContactStats(...args),
  listDuplicates: (...args: unknown[]) => listDuplicates(...args),
}));

const STATS = {
  period: "7d",
  period_start: "2026-09-19T00:00:00Z",
  period_end: "2026-09-26T00:00:00Z",
  new_count: 38,
  by_stage: { prospect: 21, lead: 11, customer: 6, other: 0 },
  series: [4, 7, 5, 9, 3, 6, 4].map((count, i) => ({ bucket: `2026-09-2${i}`, count })),
};

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

describe("ContactsSummary — el bento de la lista", () => {
  it("cuenta los nuevos y cómo llegan, y la isla nombra la primera pareja", async () => {
    getContactStats.mockResolvedValue(STATS);
    listDuplicates.mockResolvedValue([
      { contact_a_id: "a", contact_b_id: "b", a_name: "Ana Gómez", b_name: "Ana María Gómez", reason: "email_exact", confidence: 0.96 },
      { contact_a_id: "c", contact_b_id: "d", a_name: "Luis", b_name: "Luis P.", reason: "similar_name", confidence: 0.7 },
    ]);
    render(<ContactsSummary />);
    expect(await screen.findByText("38")).toBeInTheDocument();
    expect(screen.getByText("Cómo llegan los nuevos · 7 días")).toBeInTheDocument();
    expect(screen.getByText("prospectos", { exact: false })).toBeInTheDocument();
    expect(await screen.findByText("2 posibles duplicados")).toBeInTheDocument();
    expect(screen.getByText("Ana Gómez y Ana María Gómez")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Revisar/ }));
    expect(push).toHaveBeenCalledWith("/crm/contacts/duplicates");
  });

  it("cambiar el período vuelve a pedir los nuevos de ese período", async () => {
    getContactStats.mockResolvedValue(STATS);
    listDuplicates.mockResolvedValue([]);
    render(<ContactsSummary />);
    await screen.findByText("38");
    fireEvent.click(screen.getByRole("radio", { name: "30 días" }));
    await waitFor(() => expect(getContactStats).toHaveBeenLastCalledWith("30d"));
  });

  it("sin duplicados lo dice; un error se ve con reintento, nunca como cero", async () => {
    getContactStats.mockRejectedValueOnce(new Error("caída")).mockResolvedValue(STATS);
    listDuplicates.mockResolvedValue([]);
    render(<ContactsSummary />);
    expect(await screen.findByText("Sin duplicados aparentes")).toBeInTheDocument();
    const retry = await screen.findAllByRole("button", { name: /Reintentar/ });
    expect(screen.queryByText("0")).toBeNull();
    fireEvent.click(retry[0]);
    expect(await screen.findByText("38")).toBeInTheDocument();
  });
});
