import { render, screen } from "@testing-library/react";
import { ContactCallsList } from "../ContactCallsList";

const listCallSessions = jest.fn();
jest.mock("@/modules/calls/infrastructure/services/calls-service.adapter", () => ({
  listCallSessions: (...args: unknown[]) => listCallSessions(...args),
  getCallRecordingUrl: jest.fn(),
}));
jest.mock("next/link", () => ({ __esModule: true, default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

const call = (over: Record<string, unknown>) => ({
  id: "k1",
  status: "completed",
  direction: "outbound",
  purpose: "crm_task",
  started_at: "2026-09-18T15:00:00Z",
  ended_at: "2026-09-18T15:03:41Z",
  duration_seconds: 221,
  result: null,
  recording_available: true,
  contact: { id: "laura", full_name: "Laura Gómez" },
  ...over,
});

beforeEach(() => listCallSessions.mockReset());

describe("ContactCallsList — al cambiar de contacto (deuda D2)", () => {
  it("con la respuesta del nuevo pendiente, no se ven las llamadas del anterior", async () => {
    listCallSessions.mockResolvedValueOnce({ data: [call({ id: "de-laura" })], meta: { total: 1 } });
    const { container, rerender } = render(<ContactCallsList contactId="laura" />);
    expect(await screen.findByText("Seguimiento CRM")).toBeInTheDocument();

    listCallSessions.mockReturnValueOnce(new Promise(() => {}));
    rerender(<ContactCallsList contactId="mariana" />);
    expect(screen.queryByText("Seguimiento CRM")).not.toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(listCallSessions).toHaveBeenLastCalledWith(expect.objectContaining({ contact_id: "mariana" }));
  });

  it("un refresco del MISMO contacto (version) no vuelve a la silueta", async () => {
    listCallSessions.mockResolvedValueOnce({ data: [call({ id: "de-laura" })], meta: { total: 1 } });
    const { container, rerender } = render(<ContactCallsList contactId="laura" />);
    expect(await screen.findByText("Seguimiento CRM")).toBeInTheDocument();
    listCallSessions.mockReturnValueOnce(new Promise(() => {}));
    rerender(<ContactCallsList contactId="laura" version={1} />);
    expect(screen.getByText("Seguimiento CRM")).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
  });
});
