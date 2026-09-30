import { render, screen } from "@testing-library/react";
import type { AppointmentDTO } from "@/modules/scheduling/domain/appointment";
import { AppointmentOriginCard } from "../AppointmentOriginCard";

const BOGOTA = "America/Bogota";

function appointment(overrides: Partial<AppointmentDTO> = {}): AppointmentDTO {
  return {
    id: "a1",
    contact_id: "c1",
    product_id: null,
    assigned_user_id: null,
    starts_at: "2026-09-30T16:00:00.000Z",
    ends_at: "2026-09-30T16:45:00.000Z",
    status: "confirmed",
    notes: null,
    created_by_type: "ai_agent",
    created_by_user_id: null,
    conversation_id: null,
    call_session_id: null,
    cancelled_at: null,
    cancellation_reason: null,
    // 29 sep, 4:12 p. m. en Bogotá.
    created_at: "2026-09-29T21:12:00.000Z",
    updated_at: "2026-09-29T21:12:00.000Z",
    ...overrides,
  };
}

describe("AppointmentOriginCard", () => {
  it("agendada por Axi en una llamada: «Ver llamada» abre esa llamada", () => {
    render(
      <AppointmentOriginCard
        appointment={appointment({ call_session_id: "cs-1" })}
        currentUserId={null}
        timezone={BOGOTA}
      />,
    );
    expect(screen.getByText("Agendada por Axi en una llamada")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /ver llamada/i });
    expect(link).toHaveAttribute("href", "/calls/cs-1");
    // El bug: antes decía «Ver conversación» y llevaba al Inbox con el id de la llamada.
    expect(screen.queryByRole("link", { name: /ver conversación/i })).not.toBeInTheDocument();
    expect(screen.getByText(/29 de septiembre, 4:12/)).toBeInTheDocument();
  });

  it("agendada por Axi en una conversación: «Ver conversación» abre el hilo", () => {
    render(
      <AppointmentOriginCard
        appointment={appointment({ conversation_id: "cv-1" })}
        currentUserId={null}
        timezone={BOGOTA}
      />,
    );
    expect(screen.getByRole("link", { name: /ver conversación/i })).toHaveAttribute(
      "href",
      "/workspace/inbox/cv-1",
    );
    expect(screen.queryByRole("link", { name: /ver llamada/i })).not.toBeInTheDocument();
  });

  it("creada por el equipo: dice quién y no enlaza a nada", () => {
    const { rerender } = render(
      <AppointmentOriginCard
        appointment={appointment({ created_by_type: "user", created_by_user_id: "u-1" })}
        currentUserId="u-1"
        timezone={BOGOTA}
      />,
    );
    expect(screen.getByText("Creada por ti")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    rerender(
      <AppointmentOriginCard
        appointment={appointment({ created_by_type: "user", created_by_user_id: "u-2" })}
        currentUserId="u-1"
        timezone={BOGOTA}
      />,
    );
    expect(screen.getByText("Creada por tu equipo")).toBeInTheDocument();
  });
});
