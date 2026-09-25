/**
 * La línea de tiempo de «Bienvenida enviada» (entrega_premium_plan.md, F3): lo
 * que pasó con la entrega, paso a paso, con la hora que el servidor registró.
 * Si un paso no tiene hora propia en el contrato, no se inventa: va sin hora.
 */
import { deliveryRecipients, latestOwnerAttempt, type RecipientStatus } from "./delivery";

export type TimelineState = "done" | "active" | "waiting" | "failed";

export type TimelineItem = {
  id: "committed" | "invite" | "owner_mail" | "team_mail" | "password";
  state: TimelineState;
  title: string;
  detail: string | null;
  /** Instante registrado por el servidor; null si el contrato no lo trae. */
  at: string | null;
};

type TimelineDelivery = {
  status: "draft" | "committed" | "mail_queued" | "sent" | "failed";
  created_at: string;
  password_set_at: string | null;
  cc: readonly string[];
  steps: { offer: boolean; trial: boolean; invite: boolean; kit: boolean; committed: boolean };
  attempts: readonly {
    attempt: number;
    audience: "owner" | "team";
    recipient?: string | null;
    recipient_masked: string;
    status: RecipientStatus;
    provider_message_id: string | null;
    error: string | null;
    sent_at: string | null;
  }[];
};

function mailState(status: RecipientStatus): TimelineState {
  return status === "sent" ? "done" : status === "failed" ? "failed" : "active";
}

export function deliveryTimeline(
  delivery: TimelineDelivery,
  owner: { name: string | null; email: string | null },
): TimelineItem[] {
  const recipients = deliveryRecipients(delivery, owner.email);
  const ownerRecipient = recipients.find((recipient) => recipient.role === "owner");
  const ownerAttempt = latestOwnerAttempt(delivery.attempts);
  const firstName = owner.name?.trim().split(/\s+/)[0] || "El dueño";
  const items: TimelineItem[] = [];

  items.push({
    id: "committed",
    state: delivery.steps.committed ? "done" : "active",
    title: delivery.steps.trial ? "Oferta guardada y prueba reiniciada" : "Oferta guardada",
    detail: delivery.steps.kit ? "El kit de bienvenida quedó listo" : null,
    at: delivery.created_at,
  });

  items.push({
    id: "invite",
    state: delivery.steps.invite ? "done" : "active",
    title: "Enlace de un solo uso emitido",
    detail: "Solo viaja en el correo del dueño",
    at: null,
  });

  const ownerStatus = ownerRecipient?.status ?? "pending";
  items.push({
    id: "owner_mail",
    state: mailState(ownerStatus),
    title:
      ownerStatus === "sent"
        ? `Correo entregado a ${ownerRecipient?.email ?? "el dueño"}`
        : ownerStatus === "failed"
          ? "El correo del dueño no salió"
          : "Correo del dueño en camino",
    detail:
      ownerStatus === "failed"
        ? (ownerRecipient?.error ?? "Reenviar lo intenta de nuevo")
        : ownerAttempt && ownerAttempt.attempt > 1
          ? `Intento ${ownerAttempt.attempt} · con las dos citas en .ics`
          : "Con las dos citas en .ics",
    at: ownerStatus === "sent" ? (ownerAttempt?.sent_at ?? null) : null,
  });

  const team = recipients.filter((recipient) => recipient.role === "cc");
  if (team.length > 0) {
    const failed = team.filter((recipient) => recipient.status === "failed");
    const pending = team.filter((recipient) => recipient.status === "pending");
    const teamSentAt = delivery.attempts
      .filter((attempt) => attempt.audience === "team" && attempt.sent_at)
      .map((attempt) => attempt.sent_at as string)
      .sort()
      .at(-1) ?? null;
    items.push({
      id: "team_mail",
      state: failed.length > 0 ? "failed" : pending.length > 0 ? "active" : "done",
      title:
        failed.length > 0
          ? `La copia no salió a ${failed.map((recipient) => recipient.email).join(", ")}`
          : pending.length > 0
            ? "Copia al equipo en camino"
            : team.length === 1
              ? `Copia entregada a ${team[0]?.email}`
              : `Copia entregada a ${team.length} personas del equipo`,
      detail: failed.length > 0 ? (failed[0]?.error ?? null) : "Sin enlace: dice que el dueño recibió su acceso",
      at: failed.length === 0 && pending.length === 0 ? teamSentAt : null,
    });
  }

  items.push({
    id: "password",
    state: delivery.password_set_at ? "done" : ownerStatus === "sent" ? "waiting" : "active",
    title: `${firstName} crea su contraseña`,
    detail: delivery.password_set_at
      ? "Ya entra a su panel"
      : ownerStatus === "sent"
        ? "Te avisamos aquí apenas la cree: esta página se actualiza sola"
        : "Cuando le llegue el correo",
    at: delivery.password_set_at,
  });

  return items;
}
