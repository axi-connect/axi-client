import { act, render, screen } from "@testing-library/react";
import { AppointmentFormModal } from "../AppointmentFormModal";

let search = new URLSearchParams("reschedule=A");
jest.mock("next/navigation", () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/scheduling/calendar/create",
  useSearchParams: () => search,
}));
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert: jest.fn() }) }));
jest.mock("@/modules/scheduling/infrastructure/hooks/use-company-schedule", () => ({
  useCompanySchedule: () => ({ timezone: "America/Bogota", schedules: [], loading: false }),
}));
jest.mock("@/modules/scheduling/infrastructure/services/entity-names.cache", () => ({
  hydrateContactNames: jest.fn(async (ids: string[]) => Object.fromEntries(ids.map((id) => [id, `Contacto ${id}`]))),
  hydrateServiceNames: jest.fn(async () => new Map([["svc-A", "Servicio A"]])),
}));

type Deferred = { resolve: (value: unknown) => void };
const pending: Record<string, Deferred> = {};
jest.mock("@/modules/scheduling/infrastructure/services/appointments-service.adapter", () => ({
  getAppointment: (id: string) => new Promise((resolve) => (pending[id] = { resolve })),
}));
// El compositor de verdad no importa aquí: se pinta qué cita y qué duración recibe.
jest.mock("../appointment-form/AppointmentComposer", () => ({
  AppointmentComposer: ({ mode }: { mode: { kind: string; appointment?: { id: string; product_id: string | null; starts_at: string; ends_at: string } } }) => (
    <p data-testid="composer">
      {mode.kind === "reschedule" && mode.appointment
        ? `${mode.appointment.id}|${mode.appointment.product_id ?? "sin"}|${
            (new Date(mode.appointment.ends_at).getTime() - new Date(mode.appointment.starts_at).getTime()) / 60_000
          }`
        : "create"}
    </p>
  ),
}));

function appointment(id: string, productId: string | null, minutes: number) {
  const starts = new Date("2026-10-01T15:00:00.000Z");
  return {
    id,
    contact_id: `c-${id}`,
    product_id: productId,
    starts_at: starts.toISOString(),
    ends_at: new Date(starts.getTime() + minutes * 60_000).toISOString(),
  };
}

describe("AppointmentFormModal · reagendar otra cita con el slot montado", () => {
  it("mientras llega B no monta el formulario con A; cuando llega, es B", async () => {
    const view = render(<AppointmentFormModal closeBehavior="back" />);
    await act(async () => {
      pending.A.resolve(appointment("A", "svc-A", 45));
    });
    expect(screen.getByTestId("composer")).toHaveTextContent("A|svc-A|45");

    // Otra cita, mismo modal (el slot @form no se desmonta al navegar).
    search = new URLSearchParams("reschedule=B");
    view.rerender(<AppointmentFormModal closeBehavior="back" />);
    // B todavía no llega: nada de la cita A a la vista (se guardaría sobre A).
    expect(screen.queryByTestId("composer")).not.toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Cargando" })).toBeInTheDocument();

    await act(async () => {
      pending.B.resolve(appointment("B", null, 30));
    });
    expect(screen.getByTestId("composer")).toHaveTextContent("B|sin|30");
  });
});
